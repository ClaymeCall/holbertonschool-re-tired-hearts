// Pure business rules of docs/messaging-rules.md: no database, no framework, easy to test.

// One side of a conversation, as read from the database (users + profiles).
export interface Party {
  userId: number;
  isAdmin: boolean;
  accountStatus: string;
  profileId: number | null;
  moderationStatus: string | null;
  messagingEnabled: boolean | null;
  displayName: string | null;
  approximateLocation: string | null;
}

// A member who can be reached or shown: active account and approved profile.
export function isAvailable(party: Party): boolean {
  return party.accountStatus === 'active' && party.moderationStatus === 'approved';
}

// "Authorized to communicate": available AND private messaging switched on.
export function acceptsMessages(party: Party): boolean {
  return isAvailable(party) && party.messagingEnabled === true;
}

// Reading or listing conversations is a protected member feature: an active account and an
// approved profile are required, but the privacy switch does not hide the past.
export function canUseMessaging(party: Party): boolean {
  return isAvailable(party);
}

export type SendRefusal =
  | 'same-person'
  | 'recipient-unavailable'
  | 'recipient-messaging-off'
  | 'sender-messaging-off'
  | 'no-contact-link';

// Why `sender` may not send a message to `recipient` right now, or null when allowed.
// A contact link (shared event, organizer link, or a moderator sender) is only required to START a
// conversation: once it exists it continues as long as both sides stay authorized.
export function sendRefusal(input: {
  sender: Party;
  recipient: Party;
  conversationExists: boolean;
  hasContactLink: boolean;
}): SendRefusal | null {
  const { sender, recipient, conversationExists, hasContactLink } = input;
  if (sender.userId === recipient.userId) return 'same-person';
  if (!isAvailable(recipient)) return 'recipient-unavailable';
  if (!acceptsMessages(recipient)) return 'recipient-messaging-off';
  if (!acceptsMessages(sender)) return 'sender-messaging-off';
  if (!conversationExists && !sender.isAdmin && !hasContactLink) return 'no-contact-link';
  return null;
}
