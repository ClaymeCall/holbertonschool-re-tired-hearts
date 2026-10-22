#!/usr/bin/env bash
set -uo pipefail

# Walks the four messaging scenarios required by issue #63, straight against the API with curl:
# an empty conversation, an invalid message, a successful exchange between authorized members, and
# an attempt to reach a conversation that is not yours. Each call is checked against the status the
# rules of docs/messaging-rules.md predict, and the script exits with 1 if one of them differs.
#
# Prerequisites: the API running (`docker compose up`) and seeded (`npm run seed`): it uses the
# demo accounts of backend/src/database/seeds/users.seed.ts (moderator, alice who organizes the
# published hike, bob who is registered to it).
#
# The script creates its own member ("Eva", a new email at each run) so that the first scenario
# starts from a really empty conversation: she registers, is approved by the moderator, and
# registers to Alice's event, which gives her a contact link with Bob. Re-seeding resets everything
# (docs/contributing.md, "Recreating a blank database and reseeding").
#
# Registration and login are rate-limited (5 per minute, docs/api-conventions.md): the script uses
# 4 of them, so wait a minute between two runs.
#
# Usage: BASE_URL=http://localhost:3000/v1 ./scripts/demo-phase3-messaging.sh

BASE_URL="${BASE_URL:-http://localhost:3000/v1}"
MODERATOR_EMAIL="moderator@retired-hearts.demo"
MODERATOR_PASSWORD="DemoModerator123!"
ALICE_EMAIL="alice@retired-hearts.demo"
BOB_EMAIL="bob@retired-hearts.demo"
MEMBER_PASSWORD="DemoMember123!"
EVA_EMAIL="eva.$(date +%s)@retired-hearts.demo"

MODERATOR_COOKIES="$(mktemp)"
ALICE_COOKIES="$(mktemp)"
BOB_COOKIES="$(mktemp)"
EVA_COOKIES="$(mktemp)"
trap 'rm -f "$MODERATOR_COOKIES" "$ALICE_COOKIES" "$BOB_COOKIES" "$EVA_COOKIES"' EXIT

FAILURES=0
LAST_STATUS=""
LAST_BODY=""

section() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# call METHOD PATH COOKIE_JAR EXPECTED_STATUS [JSON_BODY]
# Prints the status and the JSON body, then whether the status is the expected one. Sets
# LAST_STATUS / LAST_BODY (so it must not be run inside $(...)).
call() {
  local method=$1 path=$2 cookie_jar=$3 expected=$4 body=${5:-}
  local response
  if [ -n "$body" ]; then
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' \
      -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body")
  else
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' -X "$method" "$BASE_URL$path")
  fi
  LAST_STATUS=$(tail -n1 <<<"$response")
  LAST_BODY=$(sed '$d' <<<"$response")
  echo "$method $path -> HTTP $LAST_STATUS"
  echo "$LAST_BODY"
  if [ "$LAST_STATUS" = "$expected" ]; then
    printf '\033[32m  ok: %s as expected\033[0m\n\n' "$expected"
  else
    printf '\033[31m  FAILED: expected %s\033[0m\n\n' "$expected"
    FAILURES=$((FAILURES + 1))
  fi
}

# Same as call, without printing anything but problems: for the setup steps.
quiet() {
  local method=$1 path=$2 cookie_jar=$3 expected=$4 body=${5:-}
  local response
  if [ -n "$body" ]; then
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' \
      -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body")
  else
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' -X "$method" "$BASE_URL$path")
  fi
  LAST_STATUS=$(tail -n1 <<<"$response")
  LAST_BODY=$(sed '$d' <<<"$response")
  if [ "$LAST_STATUS" != "$expected" ]; then
    printf '\033[31mSetup failed: %s %s -> HTTP %s (expected %s)\n%s\033[0m\n' \
      "$method" "$path" "$LAST_STATUS" "$expected" "$LAST_BODY"
    exit 2
  fi
}

# First "id":N of the last response whose object starts with the given text, e.g. '"title":"Sunday'.
id_before() { grep -o "\"id\":[0-9]*,$1" <<<"$LAST_BODY" | head -n1 | sed 's/"id":\([0-9]*\),.*/\1/'; }

section "Setup: a new member (Eva), approved by the moderator, who shares Alice's event with Bob"
quiet POST /auth/register "$EVA_COOKIES" 201 "{\"email\":\"$EVA_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}"
quiet PATCH /profiles/me "$EVA_COOKIES" 200 '{"displayName":"Eva Martin","approximateLocation":"Lyon","bio":"New member, here for the demo."}'
EVA_PROFILE=$(grep -o '"id":[0-9]*' <<<"$LAST_BODY" | head -n1 | sed 's/"id"://')
echo "Eva registered (profile $EVA_PROFILE, profile still pending)."

section "A pending member cannot use messaging yet"
call GET /conversations "$EVA_COOKIES" 403

quiet POST /auth/login "$MODERATOR_COOKIES" 200 "{\"email\":\"$MODERATOR_EMAIL\",\"password\":\"$MODERATOR_PASSWORD\"}"
quiet POST "/moderation/profiles/$EVA_PROFILE/approve" "$MODERATOR_COOKIES" 200 '{"reason":"demo"}'
quiet GET "/events?location=Lyon&limit=50" "$EVA_COOKIES" 200
EVENT_ID=$(id_before '"title":"Sunday hike')
quiet POST "/events/$EVENT_ID/registrations" "$EVA_COOKIES" 201
quiet POST /auth/login "$BOB_COOKIES" 200 "{\"email\":\"$BOB_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}"
quiet GET /profiles "$BOB_COOKIES" 200
BOB_PROFILE=$(id_before '"displayName":"Bob Laurent"')
echo "Moderator approved Eva, Eva registered to event $EVENT_ID (profile of Bob: $BOB_PROFILE)."
if [ -z "$EVA_PROFILE" ] || [ -z "$EVENT_ID" ] || [ -z "$BOB_PROFILE" ]; then
  echo "Setup failed: could not find the ids (is the database seeded?)." >&2
  exit 2
fi

section "1. Empty conversation: Eva has no conversation yet, and no message with Bob"
call GET /conversations "$EVA_COOKIES" 200
call GET "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 200

section "2. Invalid messages: empty, only spaces, over 1,000 characters"
call POST "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 400 '{"content":""}'
call POST "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 400 '{"content":"     "}'
TOO_LONG=$(printf 'a%.0s' $(seq 1 1001))
call POST "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 400 "{\"content\":\"$TOO_LONG\"}"
echo "The history is still empty (nothing was stored):"
call GET "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 200

section "3. Successful exchange between two authorized members: Eva writes to Bob, Bob answers"
call POST "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 201 '{"content":"Bonjour Bob, je viens de m'"'"'inscrire à la randonnée !"}'
echo "Bob has unread messages: Eva's new one, plus the one from Alice in the seed:"
call GET /conversations/unread-count "$BOB_COOKIES" 200
call GET /conversations "$BOB_COOKIES" 200
call POST "/conversations/with/$EVA_PROFILE/messages" "$BOB_COOKIES" 201 '{"content":"Bienvenue Eva, à dimanche !"}'
call POST "/conversations/with/$EVA_PROFILE/read" "$BOB_COOKIES" 204
echo "Eva reads the whole history (fromMe tells which side wrote):"
call GET "/conversations/with/$BOB_PROFILE/messages" "$EVA_COOKIES" 200

section "4. Attempt to reach a conversation that is not yours: Alice and the Eva/Bob conversation"
quiet POST /auth/login "$ALICE_COOKIES" 200 "{\"email\":\"$ALICE_EMAIL\",\"password\":\"$MEMBER_PASSWORD\"}"
echo "Every route is 'my conversation with X': Alice sees her own (empty) one with Eva, never Eva's with Bob."
call GET "/conversations/with/$EVA_PROFILE/messages" "$ALICE_COOKIES" 200
echo "Alice's list only holds her own conversation (with Bob):"
call GET /conversations "$ALICE_COOKIES" 200
echo "There is no route addressed by a conversation id, so no identifier to guess:"
call GET /conversations/1/messages "$ALICE_COOKIES" 404
echo "Anonymous callers get nothing:"
call GET "/conversations/with/$BOB_PROFILE/messages" "$(mktemp)" 401

echo
if [ "$FAILURES" -eq 0 ]; then
  printf '\033[32mAll scenarios behaved as the rules predict.\033[0m\n'
else
  printf '\033[31m%s call(s) did not behave as expected.\033[0m\n' "$FAILURES"
  exit 1
fi
