#!/usr/bin/env bash
set -uo pipefail

# Walks the four Phase 1 identity/profile scenarios required by issue #46, straight against the
# API with curl. This is the backend half of the demo: it proves the API rules in isolation. The
# live presentation (docs/requirements.md:195-196) still walks the same scenarios through the Vue
# UI — see docs/user-journeys.md (Journey A) for that script.
#
# Prerequisites: the API running (`docker compose up`) and seeded (`npm run seed`), so that
# alice/bob/carol exist — see backend/src/database/seeds/users.seed.ts for their credentials and
# backend/src/database/seeds/profiles.seed.ts for their moderation status (alice and bob are
# approved, carol is pending).
#
# Usage: BASE_URL=http://localhost:3000/v1 ./scripts/demo-phase1-identity.sh

BASE_URL="${BASE_URL:-http://localhost:3000/v1}"
ALICE_EMAIL="alice@retired-hearts.demo"
ALICE_PASSWORD="DemoMember123!"
BOB_EMAIL="bob@retired-hearts.demo"
BOB_PASSWORD="DemoMember123!"

ALICE_COOKIES="$(mktemp)"
BOB_COOKIES="$(mktemp)"
trap 'rm -f "$ALICE_COOKIES" "$BOB_COOKIES"' EXIT

section() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# Prints the status code and the JSON body of one call.
call() {
  local method=$1 path=$2 cookie_jar=$3 body=${4:-}
  local response status
  if [ -n "$body" ]; then
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' \
      -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body")
  else
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' -X "$method" "$BASE_URL$path")
  fi
  status=$(tail -n1 <<<"$response")
  echo "$method $path -> HTTP $status"
  head -n -1 <<<"$response"
  echo
}

section "1. Anonymous request: GET /profiles without a session"
call GET /profiles "$(mktemp)"

section "2. Invalid credential: login as Alice with the wrong password"
call POST /auth/login "$(mktemp)" "{\"email\":\"$ALICE_EMAIL\",\"password\":\"not-the-right-password\"}"

section "3. Member editing their own profile: Alice logs in and updates her bio"
call POST /auth/login "$ALICE_COOKIES" "{\"email\":\"$ALICE_EMAIL\",\"password\":\"$ALICE_PASSWORD\"}"
call GET /profiles/me "$ALICE_COOKIES"
call PATCH /profiles/me "$ALICE_COOKIES" '{"displayName":"Alice Moreau","approximateLocation":"Lyon","bio":"Updated live during the demo."}'

section "4. Authenticated member discovering an approved profile: Bob logs in and browses profiles"
call POST /auth/login "$BOB_COOKIES" "{\"email\":\"$BOB_EMAIL\",\"password\":\"$BOB_PASSWORD\"}"
call GET /profiles "$BOB_COOKIES"
