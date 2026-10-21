import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationSummaryDto, MessageResponseDto, UnreadCountDto } from './dto/messaging-response.dto';
import { Party, SendRefusal, canUseMessaging, isAvailable, sendRefusal } from './messaging-rules';

interface MessageRow {
  id: number;
  content: string;
  sentAt: Date;
  fromMe: boolean;
}

const toMessage = (row: MessageRow): MessageResponseDto => ({
  id: row.id,
  content: row.content,
  sentAt: new Date(row.sentAt).toISOString(),
  fromMe: row.fromMe,
});

// The other person is always designated by their PROFILE id (the id shown by discovery), never by a
// conversation id: every route only ever addresses "my conversation with that person", so there is
// no identifier to change in order to read someone else's conversation.
@Injectable()
export class MessagingService {
  private static readonly PARTY_SELECT = `
    SELECT u.id AS "userId", u.is_admin AS "isAdmin", u.account_status AS "accountStatus",
           p.id AS "profileId", p.moderation_status AS "moderationStatus",
           p.messaging_enabled AS "messagingEnabled", p.display_name AS "displayName",
           p.approximate_location AS "approximateLocation"`;

  constructor(private readonly dataSource: DataSource) {}

  // ---------- reading ----------

  async listConversations(user: User): Promise<ConversationSummaryDto[]> {
    await this.loadCaller(user);
    const rows = await this.dataSource.query(
      `SELECT p.id AS "personId", p.display_name AS "displayName",
              p.approximate_location AS "approximateLocation",
              (u.account_status = 'active' AND p.moderation_status = 'approved') AS "available",
              lm.id AS "lastId", lm.content AS "lastContent", lm.created_at AS "lastSentAt",
              (lm.sender_id = $1) AS "lastFromMe",
              (SELECT count(*)::int FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id <> $1 AND m.read_at IS NULL) AS "unreadCount"
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.participant_one_id = $1 THEN c.participant_two_id
                                   ELSE c.participant_one_id END
       JOIN profiles p ON p.user_id = u.id
       JOIN LATERAL (SELECT id, content, created_at, sender_id FROM messages
                      WHERE conversation_id = c.id
                      ORDER BY created_at DESC, id DESC LIMIT 1) lm ON true
       WHERE c.participant_one_id = $1 OR c.participant_two_id = $1
       ORDER BY lm.created_at DESC, lm.id DESC`,
      [user.id],
    );
    return rows.map((row: Record<string, unknown>) => ({
      person: {
        id: row.personId as number,
        // An unavailable person is shown without account details (docs/messaging-rules.md).
        displayName: row.available ? (row.displayName as string) : null,
        approximateLocation: row.available ? (row.approximateLocation as string) : null,
        available: row.available as boolean,
      },
      lastMessage: toMessage({
        id: row.lastId as number,
        content: row.lastContent as string,
        sentAt: row.lastSentAt as Date,
        fromMe: row.lastFromMe as boolean,
      }),
      unreadCount: row.unreadCount as number,
    }));
  }

  async unreadCount(user: User): Promise<UnreadCountDto> {
    await this.loadCaller(user);
    const [{ total }] = await this.dataSource.query(
      `SELECT count(*)::int AS total
       FROM messages m JOIN conversations c ON c.id = m.conversation_id
       WHERE (c.participant_one_id = $1 OR c.participant_two_id = $1)
         AND m.sender_id <> $1 AND m.read_at IS NULL`,
      [user.id],
    );
    return { unreadCount: total };
  }

  async getMessages(user: User, personId: number, limit: number): Promise<MessageResponseDto[]> {
    const caller = await this.loadCaller(user);
    const other = await this.loadOther(caller, personId);
    const conversationId = await this.findConversation(caller.userId, other.userId);

    if (conversationId === null) {
      // No history: an unreachable person answers 404 like an unknown one, a reachable one has an empty history.
      if (!isAvailable(other)) throw new NotFoundException('Person not found.');
      return [];
    }
    // The history stays readable whatever the privacy switch or the other person's status.
    const rows: MessageRow[] = await this.dataSource.query(
      `SELECT id, content, created_at AS "sentAt", (sender_id = $2) AS "fromMe"
       FROM (SELECT * FROM messages WHERE conversation_id = $1
             ORDER BY created_at DESC, id DESC LIMIT $3) latest
       ORDER BY created_at ASC, id ASC`,
      [conversationId, caller.userId, limit],
    );
    return rows.map(toMessage);
  }

  async markRead(user: User, personId: number): Promise<void> {
    const caller = await this.loadCaller(user);
    const other = await this.loadOther(caller, personId);
    const conversationId = await this.findConversation(caller.userId, other.userId);
    if (conversationId === null) return;
    await this.dataSource.query(
      `UPDATE messages SET read_at = now()
       WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
      [conversationId, caller.userId],
    );
  }

  // ---------- writing ----------

  async send(user: User, personId: number, dto: SendMessageDto): Promise<MessageResponseDto> {
    const caller = await this.loadCaller(user);
    const other = await this.loadOther(caller, personId, { allowSelf: true });

    const conversationId =
      caller.userId === other.userId ? null : await this.findConversation(caller.userId, other.userId);
    const hasContactLink =
      conversationId !== null || caller.userId === other.userId
        ? false
        : await this.hasContactLink(caller.userId, other.userId);

    const refusal = sendRefusal({ sender: caller, recipient: other, conversationExists: conversationId !== null, hasContactLink });
    if (refusal) throw this.toException(refusal);

    // The pair is always stored as (smaller id, larger id): one conversation per pair whoever writes
    // first, and two members writing at the same instant cannot create two conversations.
    const [one, two] = this.orderPair(caller.userId, other.userId);
    const message = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO conversations (participant_one_id, participant_two_id) VALUES ($1, $2)
         ON CONFLICT (participant_one_id, participant_two_id) DO NOTHING`,
        [one, two],
      );
      const [{ id }] = await manager.query(
        `SELECT id FROM conversations WHERE participant_one_id = $1 AND participant_two_id = $2`,
        [one, two],
      );
      // The sender is the authenticated member: it never comes from the request.
      const [row] = await manager.query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)
         RETURNING id, content, created_at AS "sentAt"`,
        [id, caller.userId, dto.content],
      );
      return row;
    });
    return toMessage({ ...message, fromMe: true });
  }

  // ---------- helpers ----------

  // The caller must have an active account and an approved profile (pending, blocked, suspended
  // or self-deleted members cannot use messaging, even with a valid session).
  private async loadCaller(user: User): Promise<Party> {
    const [caller]: Party[] = await this.dataSource.query(
      `${MessagingService.PARTY_SELECT}
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [user.id],
    );
    if (!caller || !canUseMessaging(caller)) {
      throw new ForbiddenException('Your account or profile cannot use messaging.');
    }
    return caller;
  }

  private async loadOther(caller: Party, personId: number, options: { allowSelf?: boolean } = {}): Promise<Party> {
    const [other]: Party[] = await this.dataSource.query(
      `${MessagingService.PARTY_SELECT}
       FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [personId],
    );
    if (!other) throw new NotFoundException('Person not found.');
    if (other.userId === caller.userId && !options.allowSelf) {
      throw new BadRequestException('You cannot write to yourself.');
    }
    return other;
  }

  private orderPair(a: number, b: number): [number, number] {
    return a < b ? [a, b] : [b, a];
  }

  private async findConversation(a: number, b: number): Promise<number | null> {
    const [one, two] = this.orderPair(a, b);
    const [row] = await this.dataSource.query(
      `SELECT id FROM conversations WHERE participant_one_id = $1 AND participant_two_id = $2`,
      [one, two],
    );
    return row ? row.id : null;
  }

  // A contact link: both registered for the same event, or one registered for an event organized
  // by the other (either direction). The state of the event does not matter, only the `registered` row.
  private async hasContactLink(a: number, b: number): Promise<boolean> {
    const [{ linked }] = await this.dataSource.query(
      `SELECT (
         EXISTS (SELECT 1 FROM event_registrations ra
                 JOIN event_registrations rb ON rb.event_id = ra.event_id
                 WHERE ra.user_id = $1 AND rb.user_id = $2
                   AND ra.status = 'registered' AND rb.status = 'registered')
         OR EXISTS (SELECT 1 FROM event_registrations r JOIN events e ON e.id = r.event_id
                    WHERE r.status = 'registered'
                      AND ((r.user_id = $1 AND e.organizer_id = $2) OR (r.user_id = $2 AND e.organizer_id = $1)))
       ) AS linked`,
      [a, b],
    );
    return linked;
  }

  private toException(refusal: SendRefusal) {
    switch (refusal) {
      case 'same-person':
        return new BadRequestException('You cannot write to yourself.');
      case 'recipient-unavailable':
        // Hidden like an unknown person: a pending or suspended profile is not revealed.
        return new NotFoundException('Person not found.');
      case 'recipient-messaging-off':
        return new ForbiddenException('This person does not accept private messages.');
      case 'sender-messaging-off':
        return new ForbiddenException('You turned off private messages in your profile.');
      case 'no-contact-link':
        return new ForbiddenException('You can only write to people you share an event with, or to an organizer.');
    }
  }
}
