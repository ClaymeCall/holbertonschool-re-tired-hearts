#!/usr/bin/env bash
set -uo pipefail

# Shows, straight against the API with curl, the three kinds of answer issue #83 asks for, each with
# the rule that explains it: invalid data (400), forbidden actions (401, 403) and moderation actions,
# including their effect on a session that is still valid. Each call is checked against the status
# the rules predict (docs/api-conventions.md, docs/role-assignment-rules.md,
# docs/profile-visibility-rules.md), and the script exits with 1 if one of them differs.
#
# Prerequisites: the API running (`docker compose up`) and seeded (`npm run seed`): it uses the
# moderator account and bob. It registers its own member ("Hector", a new email at each run), so the demo
# accounts of the seed are never changed.
#
# Registration and login are rate-limited (5 per minute, docs/api-conventions.md): the script uses
# 3, so wait a minute before running it together with another demo script.
#
# Usage: BASE_URL=http://localhost:3000/v1 ./scripts/demo-phase4-security.sh

BASE_URL="${BASE_URL:-http://localhost:3000/v1}"
MODERATOR_EMAIL="moderator@retired-hearts.demo"
MODERATOR_PASSWORD="DemoModerator123!"
HECTOR_EMAIL="hector.$(date +%s)@retired-hearts.demo"
HECTOR_PASSWORD="DemoMember123!"

# shellcheck source=demo-lib.sh
source "$(dirname "$0")/demo-lib.sh"

MODERATOR=$(make_jar)
HECTOR=$(make_jar)
BOB=$(make_jar)
ANONYMOUS=$(make_jar)

section "Setup: the moderator and Bob log in, a new member (Hector) registers and fills in a profile"
login_as "$MODERATOR" "$MODERATOR_EMAIL" "$MODERATOR_PASSWORD"
login_as "$BOB" bob@retired-hearts.demo "$HECTOR_PASSWORD"
quiet POST /auth/register "$HECTOR" 201 "{\"email\":\"$HECTOR_EMAIL\",\"password\":\"$HECTOR_PASSWORD\"}"
HECTOR_USER=$(first_id)
quiet PATCH /profiles/me "$HECTOR" 200 '{"displayName":"Hector Durand","approximateLocation":"Lyon","bio":"Member created by the demo."}'
HECTOR_PROFILE=$(first_id)
if [ -z "$HECTOR_USER" ] || [ -z "$HECTOR_PROFILE" ]; then
  echo "Setup failed: could not find the ids." >&2
  exit 2
fi
echo "Hector: account $HECTOR_USER, profile $HECTOR_PROFILE (profile still pending)."

section "1. Validation errors: the API refuses invalid data with a 400 and says why"
rule "server-side validation: every field is checked (docs/api-conventions.md)"
call PATCH /profiles/me "$HECTOR" 400 '{"displayName":"","approximateLocation":"Lyon"}'
call GET "/moderation/profiles?status=nonsense" "$MODERATOR" 400

section "2. Forbidden actions: a member cannot give themselves a role or a status"
rule "role and moderation status are not fields a member can send: the whitelist refuses the whole request"
call PATCH /profiles/me "$HECTOR" 400 '{"displayName":"Hector Durand","approximateLocation":"Lyon","moderationStatus":"approved"}'
call PATCH /profiles/me "$HECTOR" 400 '{"displayName":"Hector Durand","approximateLocation":"Lyon","isAdmin":true}'
rule "the moderation routes are reserved to moderators, checked by the API and not by the interface"
call GET "/moderation/profiles?status=pending" "$HECTOR" 403
call POST "/moderation/profiles/$HECTOR_PROFILE/approve" "$HECTOR" 403 '{}'
rule "no session, no access"
call GET /moderation/actions "$ANONYMOUS" 401
rule "a pending profile is hidden from the other members (404, as if it did not exist) and cannot use messaging"
call GET "/profiles/$HECTOR_PROFILE" "$BOB" 404
call GET /conversations "$HECTOR" 403

section "3. Moderation actions: each one is allowed, effective at once, and written in the audit log"
call GET "/moderation/profiles?status=pending" "$MODERATOR" 200
call POST "/moderation/profiles/$HECTOR_PROFILE/approve" "$MODERATOR" 200 '{"reason":"demo: profile checked"}'
echo "Same sessions as before: Bob can now see Hector's profile, and Hector can use messaging:"
call GET "/profiles/$HECTOR_PROFILE" "$BOB" 200
call GET /conversations "$HECTOR" 200
rule "a blocked profile disappears from the other members and loses messaging at once"
call POST "/moderation/profiles/$HECTOR_PROFILE/block" "$MODERATOR" 200 '{"reason":"demo: inappropriate photo"}'
call GET "/profiles/$HECTOR_PROFILE" "$BOB" 404
call GET /conversations "$HECTOR" 403
rule "a state change that does not apply is refused, not ignored"
call POST "/moderation/profiles/$HECTOR_PROFILE/block" "$MODERATOR" 409 '{}'
call POST "/moderation/profiles/$HECTOR_PROFILE/unblock" "$MODERATOR" 200 '{"reason":"demo: mistake"}'
rule "a suspended account is refused even with a token that is still valid (the account is re-read on every request)"
call POST "/moderation/users/$HECTOR_USER/suspend" "$MODERATOR" 200 '{"reason":"demo: repeated reports"}'
call GET /conversations "$HECTOR" 403
call POST "/moderation/users/$HECTOR_USER/reactivate" "$MODERATOR" 200 '{"reason":"demo: appeal accepted"}'
call GET /conversations "$HECTOR" 200
rule "a moderator cannot act on their own account"
request GET /auth/me "$MODERATOR"
MODERATOR_USER=$(first_id)
call POST "/moderation/users/$MODERATOR_USER/suspend" "$MODERATOR" 403 '{}'

section "4. The audit log: who did what to whom, and when"
call GET /moderation/actions "$MODERATOR" 200

finish
