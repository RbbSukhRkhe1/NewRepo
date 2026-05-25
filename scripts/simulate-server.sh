#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vaultex — full simulation: donations + disbursements
#
# Run on the server (or local) once the API + Anvil are up:
#   bash scripts/simulate-server.sh
#
# Env overrides:
#   API_BASE        (default http://127.0.0.1:3847/api)
#   PASSWORD        (default demo123)
#   DONATION_ROUNDS (default 2 — each round sends one donation per donor×cause)
#   DELAY           (default 1.5 seconds between actions)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${API_BASE:-http://127.0.0.1:3847/api}"
PW="${PASSWORD:-demo123}"
ROUNDS="${DONATION_ROUNDS:-2}"
DELAY="${DELAY:-1.5}"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
info() { printf "${CYAN}→${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*"; }

# ── Health check ─────────────────────────────────────────────────────────────
HEALTH_URL="${API%/api}/health"
info "Checking API at ${HEALTH_URL} ..."
if ! curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
  err "Backend not reachable at ${HEALTH_URL}"
  echo "  Start with:  npm run dev   (or ensure the server is running on the target host)"
  exit 1
fi
ok "API is up"
echo

# ── Donors (team + simulation wallets on Anvil indices 1–6) ─────────────────
DONORS=(
  "haha@vaultex.local"
  "sukhan@vaultex.local"
  "tasin@vaultex.local"
  "sam@vaultex.local"
  "priya@vaultex.local"
  "lena@vaultex.local"
)

ADMIN_EMAIL="admin@vaultex.local"

# ── Cookie jar helper ────────────────────────────────────────────────────────
COOKIE_DIR=$(mktemp -d)
trap 'rm -rf "$COOKIE_DIR"' EXIT

cookie_for() { echo "$COOKIE_DIR/$1.txt"; }

do_login() {
  local email="$1"
  local jar
  jar=$(cookie_for "$email")
  local body
  body=$(curl -s -w '\n%{http_code}' \
    -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -c "$jar" -b "$jar" \
    -d "{\"email\":\"$email\",\"password\":\"$PW\"}")
  local code
  code=$(echo "$body" | tail -1)
  if [ "$code" != "200" ]; then
    err "Login failed for $email (HTTP $code)"
    return 1
  fi
  return 0
}

# ── Fetch active causes ─────────────────────────────────────────────────────
info "Fetching active causes ..."
CAUSES_JSON=$(curl -s "$API/causes?status=active")
CAUSE_COUNT=$(echo "$CAUSES_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo 0)

if [ "$CAUSE_COUNT" -eq 0 ]; then
  err "No active causes found. Seed the database first."
  exit 1
fi

# Parse cause IDs and titles into arrays
readarray -t CAUSE_IDS < <(echo "$CAUSES_JSON" | python3 -c "
import sys, json
for c in json.load(sys.stdin):
    print(c['id'])
")
readarray -t CAUSE_TITLES < <(echo "$CAUSES_JSON" | python3 -c "
import sys, json
for c in json.load(sys.stdin):
    print(c['title'])
")

ok "Found $CAUSE_COUNT active causes:"
for i in "${!CAUSE_IDS[@]}"; do
  echo "    [${CAUSE_IDS[$i]}] ${CAUSE_TITLES[$i]}"
done
echo

# ── Cause → preferred donors mapping ────────────────────────────────────────
# Spread donors across causes so each cause gets traffic from different wallets.
# Index into DONORS array:
#   0=Haha 1=Sukhan 2=Tasin 3=Sam 4=Priya 5=Lena
#
# Cause titles (from seed): LGBTQs, War, Disaster, Hospital, Education
# We map by title keyword so the script is resilient to ID changes.
donor_indices_for_cause() {
  local title="$1"
  case "$title" in
    *LGBTQ*|*lgbtq*) echo "0 3 5" ;;   # Haha, Sam, Lena
    *War*|*war*)     echo "1 4 2" ;;   # Sukhan, Priya, Tasin
    *Disaster*)      echo "2 3 4" ;;   # Tasin, Sam, Priya
    *Hospital*)      echo "0 1 5" ;;   # Haha, Sukhan, Lena
    *Education*)     echo "4 5 0" ;;   # Priya, Lena, Haha
    *)               echo "0 1 2" ;;   # fallback
  esac
}

random_eth() {
  python3 -c "import random; print(f'{random.uniform(0.05, 0.35):.4f}')"
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 1 — DONATIONS
# ═════════════════════════════════════════════════════════════════════════════
printf "\n${BOLD}═══ PHASE 1: DONATIONS (${ROUNDS} rounds) ═══${NC}\n\n"

DONATION_NUM=0

for (( round=1; round<=ROUNDS; round++ )); do
  info "Round $round / $ROUNDS"
  for i in "${!CAUSE_IDS[@]}"; do
    cid="${CAUSE_IDS[$i]}"
    ctitle="${CAUSE_TITLES[$i]}"
    read -ra dmap <<< "$(donor_indices_for_cause "$ctitle")"

    # Pick a donor for this round (cycle through the 3 preferred donors)
    didx="${dmap[$(( (round - 1) % ${#dmap[@]} ))]}"
    donor="${DONORS[$didx]}"
    amt=$(random_eth)
    DONATION_NUM=$((DONATION_NUM + 1))

    do_login "$donor" || continue
    jar=$(cookie_for "$donor")

    resp=$(curl -s -w '\n%{http_code}' \
      -X POST "$API/donate" \
      -H 'Content-Type: application/json' \
      -c "$jar" -b "$jar" \
      -d "{\"causeId\":$cid,\"amountEth\":\"$amt\"}")
    code=$(echo "$resp" | tail -1)
    body=$(echo "$resp" | sed '$d')

    if [ "$code" = "200" ]; then
      tx=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('txHash','')[:12])" 2>/dev/null || echo "???")
      ok "[${DONATION_NUM}] ${donor%%@*} → $ctitle: $amt ETH (${tx}…)"
    else
      warn "[${DONATION_NUM}] ${donor%%@*} → $ctitle: FAILED ($code)"
    fi

    sleep "$DELAY"
  done
  echo
done

printf "${GREEN}${BOLD}Donations complete: $DONATION_NUM sent${NC}\n\n"

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2 — DISBURSEMENTS  (admin → correct beneficiary per cause)
# ═════════════════════════════════════════════════════════════════════════════
printf "${BOLD}═══ PHASE 2: DISBURSEMENTS ═══${NC}\n\n"

# Cause → recipient (set in seed.ts):
#   Hospital   → Red Cross Hospital   (anvil #7)
#   War        → WHO Disaster Relief  (anvil #8)
#   Disaster   → WHO Disaster Relief  (anvil #8)
#   LGBTQs     → WeAreHumans          (anvil #9)
#   Education  → Red Cross Hospital   (anvil #7)

disburse_message_for() {
  local title="$1"
  case "$title" in
    *Hospital*)  echo "Medical equipment batch" ;;
    *War*)       echo "Frontline medical kits" ;;
    *Disaster*)  echo "Emergency shelter deploy" ;;
    *LGBTQ*|*lgbtq*) echo "Safe housing vouchers" ;;
    *Education*) echo "School supply bundles" ;;
    *)           echo "General disbursement" ;;
  esac
}

disburse_recipient_for() {
  local title="$1"
  case "$title" in
    *Hospital*)  echo "Red Cross Hospital" ;;
    *War*)       echo "WHO Disaster Relief" ;;
    *Disaster*)  echo "WHO Disaster Relief" ;;
    *LGBTQ*|*lgbtq*) echo "WeAreHumans" ;;
    *Education*) echo "Red Cross Hospital" ;;
    *)           echo "Unknown" ;;
  esac
}

info "Logging in as admin ..."
do_login "$ADMIN_EMAIL" || { err "Admin login failed"; exit 1; }
ok "Admin logged in"
echo

ADMIN_JAR=$(cookie_for "$ADMIN_EMAIL")
DISBURSE_NUM=0

for i in "${!CAUSE_IDS[@]}"; do
  cid="${CAUSE_IDS[$i]}"
  ctitle="${CAUSE_TITLES[$i]}"
  recipient=$(disburse_recipient_for "$ctitle")
  msg=$(disburse_message_for "$ctitle")

  # Disburse ~30-50% of what was raised (random)
  amt=$(python3 -c "import random; print(f'{random.uniform(0.08, 0.25):.4f}')")
  DISBURSE_NUM=$((DISBURSE_NUM + 1))

  resp=$(curl -s -w '\n%{http_code}' \
    -X POST "$API/causes/$cid/disburse" \
    -H 'Content-Type: application/json' \
    -c "$ADMIN_JAR" -b "$ADMIN_JAR" \
    -d "{\"amountEth\":\"$amt\",\"message\":\"$msg\"}")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  if [ "$code" = "200" ]; then
    tx=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('txHash','')[:12])" 2>/dev/null || echo "???")
    ok "[D${DISBURSE_NUM}] $ctitle → $recipient: $amt ETH — \"$msg\" (${tx}…)"
  else
    warn "[D${DISBURSE_NUM}] $ctitle → $recipient: FAILED ($code)"
    echo "    $body" | head -1
  fi

  sleep "$DELAY"
done

echo
printf "${GREEN}${BOLD}Disbursements complete: $DISBURSE_NUM sent${NC}\n"

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════
echo
printf "${BOLD}═══ SIMULATION COMPLETE ═══${NC}\n"
echo "  Donations:     $DONATION_NUM"
echo "  Disbursements: $DISBURSE_NUM"
echo
echo "  Open the ledger to see live updates:"
echo "    Local:  http://localhost:5173/ledger"
echo "    Prod:   https://vaultex.club/ledger"
echo
echo "  Cause → Recipient bindings:"
echo "    Hospital   → Red Cross Hospital   (Anvil #7)"
echo "    War        → WHO Disaster Relief  (Anvil #8)"
echo "    Disaster   → WHO Disaster Relief  (Anvil #8)"
echo "    LGBTQs     → WeAreHumans          (Anvil #9)"
echo "    Education  → Red Cross Hospital   (Anvil #7)"
echo
