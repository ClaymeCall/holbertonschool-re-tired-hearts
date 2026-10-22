#!/usr/bin/env bash
set -uo pipefail

# Walks the whole life of an event, straight against the API with curl (issue #55): creation as a
# draft, publication, registrations until the event is full, a refused registration, a withdrawal
# that frees a place, and the cancellation. Each call is checked against the status the rules of
# docs/event-rules.md predict, and the script exits with 1 if one of them differs.
#
# "Completed" is the one state not reached: an event can only be completed once its start date has
# passed, and the API refuses to create an event in the past. The script shows that refusal.
#
# Prerequisites: the API running (`docker compose up`) and seeded (`npm run seed`): it uses the demo
# accounts alice (the organizer), bob, colette and gerard (see backend/src/database/seeds). It creates
# a new event at each run, with 2 places, so that "full" is reached with only two members.
#
# Login is rate-limited (5 per minute, docs/api-conventions.md): the script uses 4, so wait a minute
# between two runs.
#
# Usage: BASE_URL=http://localhost:3000/v1 ./scripts/demo-phase2-events.sh

BASE_URL="${BASE_URL:-http://localhost:3000/v1}"
MEMBER_PASSWORD="DemoMember123!"

# shellcheck source=demo-lib.sh
source "$(dirname "$0")/demo-lib.sh"

ALICE=$(make_jar)
BOB=$(make_jar)
COLETTE=$(make_jar)
GERARD=$(make_jar)

section "Setup: Alice (organizer), Bob, Colette and Gerard log in"
login_as "$ALICE" alice@retired-hearts.demo "$MEMBER_PASSWORD"
login_as "$BOB" bob@retired-hearts.demo "$MEMBER_PASSWORD"
login_as "$COLETTE" colette@retired-hearts.demo "$MEMBER_PASSWORD"
login_as "$GERARD" gerard@retired-hearts.demo "$MEMBER_PASSWORD"
quiet GET /interests "$ALICE" 200
INTEREST_ID=$(first_id)
echo "Four members are logged in (main interest used for the event: $INTEREST_ID)."

section "1. Creation: refused when invalid, then created as a draft"
rule "the capacity is at least 1 and the date is in the future (docs/event-rules.md)"
call POST /events "$ALICE" 400 \
  "{\"title\":\"Sortie sans place\",\"description\":\"Test\",\"approximateLocation\":\"Lyon\",\"startsAt\":\"$(future_date 30)\",\"capacity\":0,\"mainInterestId\":$INTEREST_ID}"
call POST /events "$ALICE" 400 \
  "{\"title\":\"Sortie dans le passé\",\"description\":\"Test\",\"approximateLocation\":\"Lyon\",\"startsAt\":\"2020-01-01T10:00:00.000Z\",\"capacity\":2,\"mainInterestId\":$INTEREST_ID}"
rule "a valid event starts as a draft"
call POST /events "$ALICE" 201 \
  "{\"title\":\"Balade démo\",\"description\":\"Une balade pour la démonstration.\",\"approximateLocation\":\"Lyon\",\"startsAt\":\"$(future_date 30)\",\"capacity\":2,\"mainInterestId\":$INTEREST_ID}"
EVENT_ID=$(first_id)
if [ -z "$EVENT_ID" ]; then
  echo "Setup failed: the event was not created." >&2
  exit 2
fi

section "2. A draft is private: Bob can neither see it nor register to it"
rule "a draft is visible only to its organizer and to moderators: for anyone else it does not exist"
call GET "/events/$EVENT_ID" "$BOB" 404
call POST "/events/$EVENT_ID/registrations" "$BOB" 404

section "3. Publication: only the organizer, and only a draft"
call POST "/events/$EVENT_ID/publish" "$BOB" 404
call POST "/events/$EVENT_ID/publish" "$ALICE" 200
call POST "/events/$EVENT_ID/publish" "$ALICE" 409

section "4. Registrations: the organizer cannot join, nobody twice, and the event fills up (2 places)"
call POST "/events/$EVENT_ID/registrations" "$ALICE" 403
call POST "/events/$EVENT_ID/registrations" "$BOB" 201
call POST "/events/$EVENT_ID/registrations" "$BOB" 409
call POST "/events/$EVENT_ID/registrations" "$COLETTE" 201
rule "no registration above the capacity"
call POST "/events/$EVENT_ID/registrations" "$GERARD" 409
rule "the capacity cannot go below the number of registered members"
call PATCH "/events/$EVENT_ID" "$ALICE" 409 '{"capacity":1}'

section "5. Withdrawal frees a place, and the refused member can now register"
call DELETE "/events/$EVENT_ID/registrations/me" "$BOB" 200
call DELETE "/events/$EVENT_ID/registrations/me" "$BOB" 409
call POST "/events/$EVENT_ID/registrations" "$GERARD" 201

section "6. End of life: completion refused before the date, cancellation reserved to the organizer"
call POST "/events/$EVENT_ID/complete" "$ALICE" 409
call DELETE "/events/$EVENT_ID" "$ALICE" 409
call POST "/events/$EVENT_ID/cancel" "$COLETTE" 403
call POST "/events/$EVENT_ID/cancel" "$ALICE" 200
echo "A cancelled event is final: it stays readable by those who registered, but nothing changes any more."
call POST "/events/$EVENT_ID/cancel" "$ALICE" 409
call PATCH "/events/$EVENT_ID" "$ALICE" 409 '{"title":"Autre titre"}'
call POST "/events/$EVENT_ID/registrations" "$BOB" 409
call GET "/events/$EVENT_ID" "$COLETTE" 200

finish
