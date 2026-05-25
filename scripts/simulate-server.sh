#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vaultex — simulate donations + disbursements from outside Docker
#
# Dependencies: curl, jq  (install jq: sudo apt install -y jq)
#
# Usage:
#   bash simulate-server.sh                       # defaults to localhost:8080
#   API=https://vaultex.club bash simulate-server.sh
#   ROUNDS=3 DELAY=2 bash simulate-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${API:-http://localhost:8080/api}"
PW="${PASSWORD:-demo123}"
ROUNDS="${ROUNDS:-2}"
DELAY="${DELAY:-1.5}"

# ── Preflight ────────────────────────────────────────────────────────────────
for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' not found. Install it:  sudo apt install -y $cmd"
    exit 1
  fi
done

G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'
R='\033[0;31m'; B='\033[1m'; N='\033[0m'
ok()   { printf "${G}✓${N} %s\n" "$*"; }
info() { printf "${C}→${N} %s\n" "$*"; }
warn() { printf "${Y}⚠${N} %s\n" "$*"; }
err()  { printf "${R}✗${N} %s\n" "$*"; }

# ── Health check ─────────────────────────────────────────────────────────────
HEALTH="${API%/api}/health"
if [ "$API" != "${API%/api}" ]; then
  HEALTH="${API%/api}/health"
else
  HEALTH="${API}/health"
fi
# If API is like https://vaultex.club/api, health is https://vaultex.club/health
# If API is like http://localhost:8080/api, health is http://localhost:8080/health

info "Checking API at $HEALTH ..."
if ! curl -sf --max-time 5 "$HEALTH" >/dev/null 2>&1; then
  # Try the /api prefix in case health is behind /api
  if ! curl -sf --max-time 5 "$API/config" >/dev/null 2>&1; then
    err "Backend not reachable at $API"
    echo "  Is docker compose running?  docker compose ps"
    exit 1
  fi
fi
ok "API is up at $API"
echo

# ── Cookie jar (temp dir, cleaned up on exit) ────────────────────────────────
CDIR=$(mktemp -d)
trap 'rm -rf "$CDIR"' EXIT

# ── login(email) → sets COOKIE_FILE ─────────────────────────────────────────
login() {
  local email="$1"
  COOKIE_FILE="$CDIR/$(echo "$email" | tr '@.' '_').txt"
  local resp
  resp=$(curl -s -w '\n%{http_code}' \
    -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -d "{\"email\":\"$email\",\"password\":\"$PW\"}")
  local code
  code=$(echo "$resp" | tail -1)
  if [ "$code" != "200" ]; then
    warn "Login failed for $email (HTTP $code)"
    return 1
  fi
  return 0
}

# ── api_post(path, json_body) → prints response body, sets HTTP_CODE ────────
api_post() {
  local path="$1" body="$2"
  local resp
  resp=$(curl -s -w '\n%{http_code}' \
    -X POST "$API$path" \
    -H 'Content-Type: application/json' \
    -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -d "$body")
  HTTP_CODE=$(echo "$resp" | tail -1)
  echo "$resp" | sed '$d'
}

# ── Random ETH amount (0.05 – 0.35, no python needed) ───────────────────────
random_eth() {
  local r=$(( RANDOM % 3000 + 500 ))
  printf "0.%04d" "$r"
}

# ── Fetch active causes ─────────────────────────────────────────────────────
info "Fetching active causes ..."
CAUSES_RAW=$(curl -s "$API/causes?status=active")
CAUSE_COUNT=$(echo "$CAUSES_RAW" | jq 'length')

if [ "$CAUSE_COUNT" -eq 0 ] || [ "$CAUSE_COUNT" = "null" ]; then
  err "No active causes found. Is the database seeded?"
  exit 1
fi

# Build parallel arrays of IDs and titles
readarray -t CAUSE_IDS    < <(echo "$CAUSES_RAW" | jq -r '.[].id')
readarray -t CAUSE_TITLES < <(echo "$CAUSES_RAW" | jq -r '.[].title')

ok "Found $CAUSE_COUNT active causes:"
for i in "${!CAUSE_IDS[@]}"; do
  echo "    [${CAUSE_IDS[$i]}] ${CAUSE_TITLES[$i]}"
done
echo

# ── All 6 seeded donors ─────────────────────────────────────────────────────
DONORS=(
  "haha@vaultex.local"
  "sukhan@vaultex.local"
  "tasin@vaultex.local"
  "sam@vaultex.local"
  "priya@vaultex.local"
  "lena@vaultex.local"
)

# ── Cause → preferred donor indices (spread across wallets) ─────────────────
donors_for() {
  case "$1" in
    *LGBTQ*|*lgbtq*) echo "0 3 5" ;;   # Haha, Sam, Lena
    *War*|*war*)     echo "1 4 2" ;;   # Sukhan, Priya, Tasin
    *Disaster*)      echo "2 3 4" ;;   # Tasin, Sam, Priya
    *Hospital*)      echo "0 1 5" ;;   # Haha, Sukhan, Lena
    *Education*)     echo "4 5 0" ;;   # Priya, Lena, Haha
    *)               echo "0 1 2" ;;
  esac
}

# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 1 — DONATIONS
# ═════════════════════════════════════════════════════════════════════════════
printf "\n${B}═══ PHASE 1: DONATIONS ($ROUNDS rounds × $CAUSE_COUNT causes) ═══${N}\n\n"
DNUM=0

for (( round=1; round<=ROUNDS; round++ )); do
  info "Round $round / $ROUNDS"
  for i in "${!CAUSE_IDS[@]}"; do
    cid="${CAUSE_IDS[$i]}"
    ct="${CAUSE_TITLES[$i]}"
    read -ra dmap <<< "$(donors_for "$ct")"
    didx="${dmap[$(( (round - 1) % ${#dmap[@]} ))]}"
    donor="${DONORS[$didx]}"
    amt=$(random_eth)
    DNUM=$((DNUM + 1))

    login "$donor" || continue
    body=$(api_post "/donate" "{\"causeId\":$cid,\"amountEth\":\"$amt\"}")

    if [ "$HTTP_CODE" = "200" ]; then
      tx=$(echo "$body" | jq -r '.txHash // empty' | head -c 12)
      ok "[$DNUM] ${donor%%@*} → $ct: $amt ETH (${tx}…)"
    else
      warn "[$DNUM] ${donor%%@*} → $ct: FAILED ($HTTP_CODE)"
    fi
    sleep "$DELAY"
  done
  echo
done
printf "${G}${B}Donations complete: $DNUM sent${N}\n\n"

# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 2 — DISBURSEMENTS (admin disburses to the bound beneficiary)
# ═════════════════════════════════════════════════════════════════════════════
printf "${B}═══ PHASE 2: DISBURSEMENTS ═══${N}\n\n"

#  Cause → Recipient (matches seed.ts):
#    Hospital   → Red Cross Hospital   (Anvil #7)
#    War        → WHO Disaster Relief  (Anvil #8)
#    Disaster   → WHO Disaster Relief  (Anvil #8)
#    LGBTQs     → WeAreHumans          (Anvil #9)
#    Education  → Red Cross Hospital   (Anvil #7)

disburse_msg() {
  case "$1" in
    *Hospital*)      echo "Medical equipment batch" ;;
    *War*)           echo "Frontline medical kits" ;;
    *Disaster*)      echo "Emergency shelter deploy" ;;
    *LGBTQ*|*lgbtq*) echo "Safe housing vouchers" ;;
    *Education*)     echo "School supply bundles" ;;
    *)               echo "General disbursement" ;;
  esac
}

recipient_for() {
  case "$1" in
    *Hospital*)      echo "Red Cross Hospital" ;;
    *War*)           echo "WHO Disaster Relief" ;;
    *Disaster*)      echo "WHO Disaster Relief" ;;
    *LGBTQ*|*lgbtq*) echo "WeAreHumans" ;;
    *Education*)     echo "Red Cross Hospital" ;;
    *)               echo "Beneficiary" ;;
  esac
}

info "Logging in as admin ..."
login "admin@vaultex.local" || { err "Admin login failed"; exit 1; }
ok "Admin session ready"
echo

DISBNUM=0
for i in "${!CAUSE_IDS[@]}"; do
  cid="${CAUSE_IDS[$i]}"
  ct="${CAUSE_TITLES[$i]}"
  recip=$(recipient_for "$ct")
  msg=$(disburse_msg "$ct")
  amt=$(random_eth)
  DISBNUM=$((DISBNUM + 1))

  body=$(api_post "/causes/$cid/disburse" "{\"amountEth\":\"$amt\",\"message\":\"$msg\"}")

  if [ "$HTTP_CODE" = "200" ]; then
    tx=$(echo "$body" | jq -r '.txHash // empty' | head -c 12)
    ok "[D$DISBNUM] $ct → $recip: $amt ETH — \"$msg\" (${tx}…)"
  else
    warn "[D$DISBNUM] $ct → $recip: FAILED ($HTTP_CODE)"
    echo "    $(echo "$body" | jq -r '.error // empty' | head -c 80)"
  fi
  sleep "$DELAY"
done

# ═════════════════════════════════════════════════════════════════════════════
#  DONE
# ═════════════════════════════════════════════════════════════════════════════
echo
printf "${B}═══ SIMULATION COMPLETE ═══${N}\n"
cat <<SUMMARY
  Donations:     $DNUM
  Disbursements: $DISBNUM

  Cause → Recipient:
    Hospital   → Red Cross Hospital   (Anvil #7)
    War        → WHO Disaster Relief  (Anvil #8)
    Disaster   → WHO Disaster Relief  (Anvil #8)
    LGBTQs     → WeAreHumans          (Anvil #9)
    Education  → Red Cross Hospital   (Anvil #7)

  View results:
    https://vaultex.club/ledger
SUMMARY
echo
