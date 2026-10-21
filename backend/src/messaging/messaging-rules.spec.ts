import { Party, acceptsMessages, canUseMessaging, isAvailable, sendRefusal } from './messaging-rules';

const party = (overrides: Partial<Party> = {}): Party => ({
  userId: 1,
  isAdmin: false,
  accountStatus: 'active',
  profileId: 10,
  moderationStatus: 'approved',
  messagingEnabled: true,
  displayName: 'Alice',
  approximateLocation: 'Lyon',
  ...overrides,
});

describe('availability', () => {
  it('needs an active account and an approved profile', () => {
    expect(isAvailable(party())).toBe(true);
    expect(isAvailable(party({ accountStatus: 'suspended' }))).toBe(false);
    expect(isAvailable(party({ accountStatus: 'self_deleted' }))).toBe(false);
    expect(isAvailable(party({ moderationStatus: 'pending' }))).toBe(false);
    expect(isAvailable(party({ moderationStatus: 'blocked' }))).toBe(false);
    expect(isAvailable(party({ moderationStatus: null, profileId: null }))).toBe(false);
  });

  it('also needs private messaging switched on to accept messages, but not to use messaging', () => {
    const off = party({ messagingEnabled: false });
    expect(acceptsMessages(off)).toBe(false);
    expect(canUseMessaging(off)).toBe(true); // the privacy switch does not hide the past
  });
});

describe('sendRefusal', () => {
  const sender = party({ userId: 1 });
  const recipient = party({ userId: 2, profileId: 20 });
  const allowed = { sender, recipient, conversationExists: false, hasContactLink: true };

  it('allows two authorized members with a contact link', () => {
    expect(sendRefusal(allowed)).toBeNull();
  });

  it('refuses to write to oneself', () => {
    expect(sendRefusal({ ...allowed, recipient: party({ userId: 1 }) })).toBe('same-person');
  });

  it.each([
    ['suspended', { accountStatus: 'suspended' }],
    ['self-deleted', { accountStatus: 'self_deleted' }],
    ['pending', { moderationStatus: 'pending' }],
    ['blocked', { moderationStatus: 'blocked' }],
  ])('hides a %s recipient (answered like an unknown person)', (_name, change) => {
    expect(sendRefusal({ ...allowed, recipient: party({ userId: 2, ...change }) })).toBe('recipient-unavailable');
  });

  it('refuses when the recipient or the sender turned private messaging off', () => {
    expect(sendRefusal({ ...allowed, recipient: party({ userId: 2, messagingEnabled: false }) })).toBe(
      'recipient-messaging-off',
    );
    expect(sendRefusal({ ...allowed, sender: party({ userId: 1, messagingEnabled: false }) })).toBe(
      'sender-messaging-off',
    );
  });

  it('requires a contact link to start a conversation', () => {
    expect(sendRefusal({ ...allowed, hasContactLink: false })).toBe('no-contact-link');
  });

  it('does not require a contact link once the conversation exists', () => {
    expect(sendRefusal({ ...allowed, hasContactLink: false, conversationExists: true })).toBeNull();
  });

  it('dispenses a moderator from the contact link, but not from the recipient conditions', () => {
    const moderator = party({ userId: 1, isAdmin: true });
    expect(sendRefusal({ ...allowed, sender: moderator, hasContactLink: false })).toBeNull();
    expect(
      sendRefusal({
        sender: moderator,
        recipient: party({ userId: 2, messagingEnabled: false }),
        conversationExists: false,
        hasContactLink: false,
      }),
    ).toBe('recipient-messaging-off');
  });

  it('keeps refusing once the conversation exists if either side lost its authorization', () => {
    expect(
      sendRefusal({ ...allowed, conversationExists: true, recipient: party({ userId: 2, messagingEnabled: false }) }),
    ).toBe('recipient-messaging-off');
    expect(
      sendRefusal({ ...allowed, conversationExists: true, recipient: party({ userId: 2, accountStatus: 'suspended' }) }),
    ).toBe('recipient-unavailable');
  });
});
