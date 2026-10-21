import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Party } from './messaging-rules';
import { MessagingService } from './messaging.service';

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

// A fake database that answers by recognizing the query, so each test only describes the situation.
function build(options: {
  caller?: Party | null;
  other?: Party | null;
  conversationId?: number | null;
  linked?: boolean;
} = {}) {
  const { caller = party(), other = party({ userId: 2, profileId: 20 }), conversationId = null, linked = true } = options;
  const calls: { sql: string; params: unknown[] }[] = [];
  const run = async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    calls.push({ sql, params });
    if (sql.includes('FROM users u LEFT JOIN profiles')) return caller ? [caller] : [];
    if (sql.includes('FROM profiles p JOIN users u')) return other ? [other] : [];
    if (sql.includes('FROM conversations WHERE participant_one_id')) return conversationId ? [{ id: conversationId }] : [];
    if (sql.includes('AS linked')) return [{ linked }];
    return [];
  };
  // Inside the transaction: the conversation row exists once inserted, and the message is created.
  const runInTransaction = async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    calls.push({ sql, params });
    if (sql.includes('INSERT INTO messages')) return [{ id: 99, content: params[2], sentAt: new Date('2026-11-02T14:00:00Z') }];
    if (sql.includes('SELECT id FROM conversations')) return [{ id: 7 }];
    return [];
  };
  const dataSource = { query: jest.fn(run), transaction: jest.fn((cb) => cb({ query: jest.fn(runInTransaction) })) };
  const service = new MessagingService(dataSource as never);
  return { service, dataSource, calls };
}

const user = { id: 1 } as User;
const dto = { content: 'Bonjour' };

describe('MessagingService.send', () => {
  it('stores the pair in order and the sender from the session', async () => {
    const { service, calls } = build({ caller: party({ userId: 5 }), other: party({ userId: 3, profileId: 20 }) });
    const sent = await service.send({ id: 5 } as User, 20, dto);

    expect(sent).toMatchObject({ id: 99, content: 'Bonjour', fromMe: true });
    const insertConversation = calls.find((c) => c.sql.includes('INSERT INTO conversations'));
    expect(insertConversation?.params).toEqual([3, 5]); // (smaller id, larger id)
    const insertMessage = calls.find((c) => c.sql.includes('INSERT INTO messages'));
    expect(insertMessage?.params).toEqual([7, 5, 'Bonjour']); // sender = authenticated member
  });

  it('refuses the first message without a contact link', async () => {
    const { service, calls } = build({ linked: false });
    await expect(service.send(user, 20, dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls.some((c) => c.sql.includes('INSERT INTO messages'))).toBe(false);
  });

  it('does not look for a contact link when the conversation already exists', async () => {
    const { service, calls } = build({ conversationId: 7, linked: false });
    await expect(service.send(user, 20, dto)).resolves.toMatchObject({ fromMe: true });
    expect(calls.some((c) => c.sql.includes('AS linked'))).toBe(false);
  });

  it('lets a moderator write without a contact link', async () => {
    const { service } = build({ caller: party({ isAdmin: true }), linked: false });
    await expect(service.send(user, 20, dto)).resolves.toBeDefined();
  });

  it.each([
    ['suspended', party({ accountStatus: 'suspended' })],
    ['pending', party({ moderationStatus: 'pending' })],
    ['blocked', party({ moderationStatus: 'blocked' })],
    ['without profile', party({ moderationStatus: null, profileId: null })],
  ])('refuses a caller who is %s before reading anything else', async (_name, caller) => {
    const { service, calls } = build({ caller });
    await expect(service.send(user, 20, dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls.some((c) => c.sql.includes('FROM profiles p JOIN users u'))).toBe(false);
  });

  it('answers 404 for an unknown person and for an unavailable recipient', async () => {
    await expect(build({ other: null }).service.send(user, 20, dto)).rejects.toBeInstanceOf(NotFoundException);
    const pending = build({ other: party({ userId: 2, moderationStatus: 'pending' }) });
    await expect(pending.service.send(user, 20, dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 403 with a clear reason when messaging is turned off', async () => {
    const recipientOff = build({ other: party({ userId: 2, messagingEnabled: false }) });
    await expect(recipientOff.service.send(user, 20, dto)).rejects.toThrow('does not accept');
    const senderOff = build({ caller: party({ messagingEnabled: false }) });
    await expect(senderOff.service.send(user, 20, dto)).rejects.toThrow('turned off');
  });

  it('answers 400 when writing to oneself', async () => {
    const { service } = build({ other: party({ userId: 1, profileId: 10 }) });
    await expect(service.send(user, 10, dto)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('MessagingService reading', () => {
  it('returns an empty history when the two have not written yet', async () => {
    await expect(build().service.getMessages(user, 20, 200)).resolves.toEqual([]);
  });

  it('answers 404 for an unreachable person with no history, like an unknown one', async () => {
    const { service } = build({ other: party({ userId: 2, accountStatus: 'suspended' }) });
    await expect(service.getMessages(user, 20, 200)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('still returns the history when the other person became unavailable or turned messaging off', async () => {
    const { service, dataSource } = build({
      other: party({ userId: 2, accountStatus: 'suspended', messagingEnabled: false }),
      conversationId: 7,
    });
    dataSource.query.mockImplementationOnce(async () => [party()]) // caller
      .mockImplementationOnce(async () => [party({ userId: 2, accountStatus: 'suspended', messagingEnabled: false })])
      .mockImplementationOnce(async () => [{ id: 7 }])
      .mockImplementationOnce(async () => [{ id: 1, content: 'Salut', sentAt: new Date(), fromMe: false }]);
    await expect(service.getMessages(user, 20, 200)).resolves.toHaveLength(1);
  });

  it.each([
    ['suspended', party({ accountStatus: 'suspended' })],
    ['pending', party({ moderationStatus: 'pending' })],
  ])('refuses to read or list for a %s member', async (_name, caller) => {
    const { service } = build({ caller });
    await expect(service.getMessages(user, 20, 200)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.listConversations(user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.unreadCount(user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.markRead(user, 20)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
