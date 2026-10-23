# Helpers shared by the demo scripts (demo-phase2-events.sh, demo-phase4-security.sh).
# Sourced, not run. The caller sets BASE_URL and calls `finish` as its last line.

FAILURES=0
LAST_STATUS=""
LAST_BODY=""
JARS=()
trap 'rm -f "${JARS[@]}"' EXIT

section() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# A cookie jar per actor, removed when the script ends.
make_jar() {
  local jar
  jar=$(mktemp)
  JARS+=("$jar")
  echo "$jar"
}

# request METHOD PATH COOKIE_JAR [JSON_BODY]: sets LAST_STATUS / LAST_BODY (so it must not be run
# inside $(...)).
request() {
  local method=$1 path=$2 cookie_jar=$3 body=${4:-}
  local response
  if [ -n "$body" ]; then
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' \
      -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body")
  else
    response=$(curl -s -b "$cookie_jar" -c "$cookie_jar" -w '\n%{http_code}' -X "$method" "$BASE_URL$path")
  fi
  LAST_STATUS=$(tail -n1 <<<"$response")
  LAST_BODY=$(sed '$d' <<<"$response")
}

# call METHOD PATH COOKIE_JAR EXPECTED_STATUS [JSON_BODY]
# Prints the status and the JSON body, then whether the status is the expected one.
call() {
  local method=$1 path=$2 cookie_jar=$3 expected=$4 body=${5:-}
  request "$method" "$path" "$cookie_jar" "$body"
  echo "$method $path -> HTTP $LAST_STATUS"
  echo "$LAST_BODY"
  if [ "$LAST_STATUS" = "$expected" ]; then
    printf '\033[32m  ok: %s as expected\033[0m\n\n' "$expected"
  else
    printf '\033[31m  FAILED: expected %s\033[0m\n\n' "$expected"
    FAILURES=$((FAILURES + 1))
  fi
}

# Same as call, printing nothing but problems: for the setup steps.
quiet() {
  local method=$1 path=$2 cookie_jar=$3 expected=$4 body=${5:-}
  request "$method" "$path" "$cookie_jar" "$body"
  if [ "$LAST_STATUS" != "$expected" ]; then
    printf '\033[31mSetup failed: %s %s -> HTTP %s (expected %s)\n%s\033[0m\n' \
      "$method" "$path" "$LAST_STATUS" "$expected" "$LAST_BODY"
    exit 2
  fi
}

# login_as JAR EMAIL PASSWORD
login_as() { quiet POST /auth/login "$1" 200 "{\"email\":\"$2\",\"password\":\"$3\"}"; }

# First "id":N of the last response.
first_id() { grep -o '"id":[0-9]*' <<<"$LAST_BODY" | head -n1 | sed 's/"id"://'; }

# ISO date N days from now (events must start in the future).
future_date() { date -u -d "+$1 days" +%Y-%m-%dT10:00:00.000Z; }

# One line saying which rule the next calls illustrate.
rule() { printf '\033[36mRule: %s\033[0m\n' "$1"; }

finish() {
  echo
  if [ "$FAILURES" -eq 0 ]; then
    printf '\033[32mAll scenarios behaved as the rules predict.\033[0m\n'
  else
    printf '\033[31m%s call(s) did not behave as expected.\033[0m\n' "$FAILURES"
    exit 1
  fi
}
