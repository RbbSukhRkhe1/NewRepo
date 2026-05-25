#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vaultex — simulate donations (continuous) then disburse exact totals
#
# Donations flow until you press ENTER → admin disburses exact totals.
# Hits the backend directly on port 3847 to avoid nginx rate limits.
#
# Dependencies: curl, jq  (sudo apt install -y jq)
#
# Usage:
#   bash simulate-server.sh
#   DELAY=2 bash simulate-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${API:-http://127.0.0.1:3847/api}"
PW="${PASSWORD:-demo123}"
DELAY="${DELAY:-2}"

for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' not found.  sudo apt install -y $cmd"
    exit 1
  fi
done

G='\033[0;32m'; Y='\033[1;33m'; C='\033[0;36m'
R='\033[0;31m'; B='\033[1m'; N='\033[0m'
ok()   { printf "${G}✓${N} %s\n" "$*"; }
info() { printf "${C}→${N} %s\n" "$*"; }
warn() { printf "${Y}⚠${N} %s\n" "$*"; }
err()  { printf "${R}✗${N} %s\n" "$*"; }

CDIR=$(mktemp -d)
RESP_FILE="$CDIR/_resp.txt"
trap 'rm -rf "$CDIR"' EXIT

LAST_CODE=""
LAST_BODY=""

# ── Health check (try backend direct, then nginx) ────────────────────────────
info "Checking API at $API ..."
if ! curl -sf --max-time 5 "${API%/api}/health" >/dev/null 2>&1; then
  if ! curl -sf --max-time 5 "$API/config" >/dev/null 2>&1; then
    err "Backend not reachable at $API"
    echo "  Try: API=http://127.0.0.1:3847/api bash simulate-server.sh"
    exit 1
  fi
fi
ok "API is up"
echo

# ── login_donor(email) → creates cookie jar, returns 0 on success ───────────
login_donor() {
  local email="$1"
  local jar="$CDIR/$(echo "$email" | tr '@.' '_').txt"
  curl -s -w '\n%{http_code}' \
    -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -c "$jar" -b "$jar" \
    -d "{\"email\":\"$email\",\"password\":\"$PW\"}" \
    > "$RESP_FILE" 2>/dev/null
  local code
  code=$(tail -1 "$RESP_FILE")
  if [ "$code" != "200" ]; then
    warn "Login failed for $email (HTTP $code)"
    return 1
  fi
  ok "Logged in: $email"
  return 0
}

# ── post_as(email, path, json_body) → sets LAST_CODE, LAST_BODY ─────────────
post_as() {
  local email="$1" path="$2" body="$3"
  local jar="$CDIR/$(echo "$email" | tr '@.' '_').txt"
  curl -s -w '\n%{http_code}' \
    -X POST "$API$path" \
    -H 'Content-Type: application/json' \
    -c "$jar" -b "$jar" \
    -d "$body" \
    > "$RESP_FILE" 2>/dev/null
  LAST_CODE=$(tail -1 "$RESP_FILE")
  LAST_BODY=$(sed '$d' "$RESP_FILE")
}

random_eth() {
  local r=$(( RANDOM % 3000 + 500 ))
  printf "0.%04d" "$r"
}

# ── Fetch active causes ─────────────────────────────────────────────────────
info "Fetching active causes ..."
CAUSES_RAW=$(curl -s "$API/causes?status=active")
CAUSE_COUNT=$(echo "$CAUSES_RAW" | jq 'length')

if [ "$CAUSE_COUNT" -eq 0 ] || [ "$CAUSE_COUNT" = "null" ]; then
  err "No active causes found. Is the database seeded?"; exit 1
fi

readarray -t CAUSE_IDS    < <(echo "$CAUSES_RAW" | jq -r '.[].id')
readarray -t CAUSE_TITLES < <(echo "$CAUSES_RAW" | jq -r '.[].title')

ok "Found $CAUSE_COUNT active causes:"
for i in "${!CAUSE_IDS[@]}"; do
  echo "    [${CAUSE_IDS[$i]}] ${CAUSE_TITLES[$i]}"
done
echo

# ── Donors ───────────────────────────────────────────────────────────────────
DONORS=(
  "haha@vaultex.local"
  "sukhan@vaultex.local"
  "tasin@vaultex.local"
  "sam@vaultex.local"
  "priya@vaultex.local"
  "lena@vaultex.local"
)

ADMIN="admin@vaultex.local"

donors_for() {
  case "$1" in
    *LGBTQ*|*lgbtq*) echo "0 3 5" ;;
    *War*|*war*)     echo "1 4 2" ;;
    *Disaster*)      echo "2 3 4" ;;
    *Hospital*)      echo "0 1 5" ;;
    *Education*)     echo "4 5 0" ;;
    *)               echo "0 1 2" ;;
  esac
}

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

# ═════════════════════════════════════════════════════════════════════════════
#  LOGIN ALL DONORS + ADMIN UP FRONT (one time only)
# ═════════════════════════════════════════════════════════════════════════════
printf "${B}═══ LOGGING IN ALL ACCOUNTS ═══${N}\n\n"

ACTIVE_DONORS=()
for d in "${DONORS[@]}"; do
  if login_donor "$d"; then
    ACTIVE_DONORS+=("$d")
  fi
done

login_donor "$ADMIN" || { err "Admin login failed — cannot disburse"; exit 1; }
echo

if [ ${#ACTIVE_DONORS[@]} -eq 0 ]; then
  err "No donors could log in. Check that the DB is seeded."
  exit 1
fi
ok "${#ACTIVE_DONORS[@]} donors ready, admin ready"
echo

# ── Per-cause running totals (integer = hundredths of a cent to avoid floats) ─
declare -A CAUSE_TOTAL_CENTS
for i in "${!CAUSE_IDS[@]}"; do
  CAUSE_TOTAL_CENTS["${CAUSE_IDS[$i]}"]=0
done

add_to_total() {
  local cid="$1" eth="$2"
  local cents
  cents=$(echo "$eth" | sed 's/^0\.//' | sed 's/^0*//')
  cents=${cents:-0}
  CAUSE_TOTAL_CENTS["$cid"]=$(( ${CAUSE_TOTAL_CENTS["$cid"]} + 10#$cents ))
}

cents_to_eth() {
  printf "0.%04d" "$1"
}

# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 1 — CONTINUOUS DONATIONS (press ENTER to stop)
# ═════════════════════════════════════════════════════════════════════════════
printf "${B}═══ PHASE 1: DONATIONS (press ENTER to stop and disburse) ═══${N}\n\n"

DNUM=0
round=0

while true; do
  round=$((round + 1))
  info "Round $round"

  for i in "${!CAUSE_IDS[@]}"; do
    # Non-blocking check for ENTER
    if read -t 0 2>/dev/null; then
      read -r 2>/dev/null || true
      echo
      info "ENTER received — moving to disbursements..."
      # Break out of both loops
      break 2
    fi

    cid="${CAUSE_IDS[$i]}"
    ct="${CAUSE_TITLES[$i]}"
    read -ra dmap <<< "$(donors_for "$ct")"
    didx="${dmap[$(( (round - 1) % ${#dmap[@]} ))]}"
    donor="${ACTIVE_DONORS[$(( didx % ${#ACTIVE_DONORS[@]} ))]}"
    amt=$(random_eth)
    DNUM=$((DNUM + 1))

    post_as "$donor" "/donate" "{\"causeId\":$cid,\"amountEth\":\"$amt\"}"

    if [ "$LAST_CODE" = "200" ]; then
      tx=$(echo "$LAST_BODY" | jq -r '.txHash // ""' | head -c 12)
      ok "[$DNUM] ${donor%%@*} → $ct: $amt ETH (${tx}…)"
      add_to_total "$cid" "$amt"
    else
      warn "[$DNUM] ${donor%%@*} → $ct: FAILED ($LAST_CODE)"
    fi
    sleep "$DELAY"
  done
  echo
done

printf "\n${G}${B}Donations complete: $DNUM sent${N}\n\n"

printf "${B}Totals raised per cause:${N}\n"
for i in "${!CAUSE_IDS[@]}"; do
  cid="${CAUSE_IDS[$i]}"
  ct="${CAUSE_TITLES[$i]}"
  cents="${CAUSE_TOTAL_CENTS[$cid]}"
  eth=$(cents_to_eth "$cents")
  printf "    %-20s %s ETH\n" "$ct" "$eth"
done
echo

# ═════════════════════════════════════════════════════════════════════════════
#  PHASE 2 — DISBURSE EXACT TOTALS
# ═════════════════════════════════════════════════════════════════════════════
printf "${B}═══ PHASE 2: DISBURSING EXACT TOTALS ═══${N}\n\n"

DISBNUM=0
for i in "${!CAUSE_IDS[@]}"; do
  cid="${CAUSE_IDS[$i]}"
  ct="${CAUSE_TITLES[$i]}"
  cents="${CAUSE_TOTAL_CENTS[$cid]}"

  if [ "$cents" -eq 0 ]; then
    info "[$ct] Nothing donated — skipping"
    continue
  fi

  amt=$(cents_to_eth "$cents")
  recip=$(recipient_for "$ct")
  msg=$(disburse_msg "$ct")
  DISBNUM=$((DISBNUM + 1))

  post_as "$ADMIN" "/causes/$cid/disburse" "{\"amountEth\":\"$amt\",\"message\":\"$msg\"}"

  if [ "$LAST_CODE" = "200" ]; then
    tx=$(echo "$LAST_BODY" | jq -r '.txHash // ""' | head -c 12)
    ok "[D$DISBNUM] $ct → $recip: $amt ETH — \"$msg\" (${tx}…)"
  else
    warn "[D$DISBNUM] $ct → $recip: FAILED ($LAST_CODE)"
    echo "    $(echo "$LAST_BODY" | jq -r '.error // ""' | head -c 80)"
  fi
  sleep "$DELAY"
done

# ═════════════════════════════════════════════════════════════════════════════
echo
printf "${B}═══ SIMULATION COMPLETE ═══${N}\n"
echo "  Donations:     $DNUM"
echo "  Disbursements: $DISBNUM"
echo
printf "  ${B}Per-cause (donated = disbursed):${N}\n"
for i in "${!CAUSE_IDS[@]}"; do
  cid="${CAUSE_IDS[$i]}"
  ct="${CAUSE_TITLES[$i]}"
  recip=$(recipient_for "$ct")
  cents="${CAUSE_TOTAL_CENTS[$cid]}"
  eth=$(cents_to_eth "$cents")
  if [ "$cents" -gt 0 ]; then
    printf "    %-20s → %-25s %s ETH  ${G}✓ zeroed${N}\n" "$ct" "$recip" "$eth"
  else
    printf "    %-20s   (no donations)\n" "$ct"
  fi
done
echo
echo "  https://vaultex.club/ledger"
echo
