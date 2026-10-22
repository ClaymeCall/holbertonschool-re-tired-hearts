# Messaging rules: conversation eligibility

Phase 0 deliverable covering issue **#26** (the same business rule is restated in #56). Entities are defined in
`docs/data-model.md`; this page fixes the rules the messaging routes (Phase 3) must follow.

## Vocabulary

- **Authorized to communicate**: a user whose account is `active` (not `suspended`, not `self_deleted`),
  whose profile is `approved`, and whose profile has `messaging_enabled = true`. Other members can read
  `messaging_enabled` on `GET /v1/profiles` and `GET /v1/profiles/:id` (`docs/profile-visibility-rules.md`) so the
  interface can grey out sending, but that flag alone never authorizes a message: the API applies the full rule below.
- **Active registration**: an `event_registrations` row with `status = 'registered'`. A `withdrawn` row grants nothing.
- **Conversation**: exactly two distinct users, stored in canonical order (`participant_one_id < participant_two_id`),
  with a database `UNIQUE` on the pair (see `docs/data-model.md`).

## Starting a conversation

There is no separate "create conversation" action: `POST /v1/conversations/with/:personId/messages` both starts
and continues a conversation, and the client cannot tell the two apart from the outside. The contact link below
(point 3) is required only for the **first** message between two users; once a conversation exists, sending
another message follows "Sending a message in an existing conversation" instead.

A member can send that first message to a recipient only if **all** of these hold:

1. the sender and the recipient are two different users;
2. both are authorized to communicate (definition above);
3. at least one of these contact links exists:
   - **shared event**: both have an active registration for the same event;
   - **organizer**: one of them has an active registration for an event organized by the other. This works in **both directions**: a registered member can write to the organizer, and the organizer can write to a registered member;
   - **moderator**: the sender is a moderator (`is_admin`). A moderator can start a conversation with any member without a contact link. The recipient's own conditions (active account, approved profile, `messaging_enabled`) still apply.

Notes:
- The state of the event is not checked: a `cancelled` or `completed` event does not prevent two people who were registered from talking, because what counts is the `registered` row. Since a `cancelled` event refuses new registrations, only people registered **before** can use it as a contact link.
- A withdrawn registration does not grant the right to start a new conversation.

## Sending a message in an existing conversation

A message is accepted only if:

1. the caller is one of the two participants, identified from the authenticated session or token (never from the request body);
2. both participants are still authorized to communicate;
3. the content is valid: 1 to 1,000 characters after trimming, plain text only (also enforced by a `CHECK` in the database).

Once created, a conversation **survives** the end of the event and the withdrawal of a participant: no event link is checked again.

## Reading the history

| Situation | Can send new messages? | Can read the history? |
|---|---|---|
| Both authorized | yes | yes (both) |
| Recipient (or sender) disabled private messaging | no, refused for both | yes (both): the privacy choice stops new messages, it does not hide the past |
| One participant suspended, self-deleted, or profile `pending`/`blocked` | no, refused for both | the other, still authorized participant can read it; the restricted participant cannot (protected features are closed to them) |
| Participant withdrew from the event | yes if still authorized | yes |
| Event ended or cancelled | yes if still authorized | yes |
| Someone who is not a participant | no | no |
| Moderator (`is_admin`) | no | **no**: no route gives moderators access to private messages |

Messages from a participant who is no longer available stay in the history; the interface shows them as coming from an
unavailable member instead of exposing account details.

## Privacy

- The sender is always the authenticated user. A body that contains a sender field is rejected (400).
- A conversation that does not belong to the caller answers **404**, exactly like one that does not exist: changing an
  identifier in the URL reveals nothing.
- Moderation actions never store message content (`moderation_actions` has no such field).
- Messages are stored and displayed as plain text: the interface never renders them as HTML.

## Error cases

| Situation | Response |
|---|---|
| Not authenticated | 401 Unauthorized |
| Caller's account suspended, or profile `pending`/`blocked` | 403 Forbidden |
| Recipient exists but does not accept private messages | 403 Forbidden, explicit message |
| No contact link (no shared event, no organizer link) and the caller is not a moderator | 403 Forbidden |
| Recipient unavailable (profile not approved, account not active) | 404 Not Found |
| Sender and recipient are the same user | 400 Bad Request |
| Empty message, longer than 1,000 characters, or unknown field in the body | 400 Bad Request |
| Conversation not found, or the caller is not a participant | 404 Not Found |

