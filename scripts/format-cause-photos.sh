#!/usr/bin/env bash
# Crop Photos (portrait) to 4:3 landscape 800×600 for Causes page heroes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/frontend/public/Photos"
OUT="${ROOT}/frontend/public/samples/causes"
ASSETS="${ROOT}/frontend/src/assets/causes"

mkdir -p "$OUT" "$ASSETS"

format_one() {
  local name="$1"
  local infile="$2"
  local tmp="${OUT}/.tmp-${name}.jpg"
  cp "$infile" "$tmp"
  local w h crop_h y0 x0 crop_w
  w=$(sips -g pixelWidth "$tmp" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$tmp" | awk '/pixelHeight/{print $2}')
  crop_h=$(( w * 3 / 4 ))
  if [ "$crop_h" -gt "$h" ]; then
    crop_w=$(( h * 4 / 3 ))
    x0=$(( (w - crop_w) / 2 ))
    sips -c "$h" "$crop_w" --cropOffset 0 "$x0" "$tmp" --out "$tmp" >/dev/null
  else
    y0=$(( (h - crop_h) / 2 ))
    sips -c "$crop_h" "$w" --cropOffset "$y0" 0 "$tmp" --out "$tmp" >/dev/null
  fi
  sips -z 600 800 "$tmp" --out "${OUT}/${name}.jpg" >/dev/null
  cp "${OUT}/${name}.jpg" "${ASSETS}/${name}.jpg"
  rm -f "$tmp"
  echo "Wrote ${OUT}/${name}.jpg (+ src/assets/causes)"
}

if [ -f "${SRC}/LGBTQs.png" ]; then
  format_one lgbtqs "${SRC}/LGBTQs.png"
elif [ -f "${SRC}/LGBTQs.jpg" ]; then
  format_one lgbtqs "${SRC}/LGBTQs.jpg"
fi
format_one war "${SRC}/War.jpg"
format_one disaster "${SRC}/Disaster.jpg"
format_one hospital "${SRC}/Hospital.jpg"
if [ -f "${SRC}/Education.jpg" ]; then
  format_one education "${SRC}/Education.jpg"
fi

echo "Done. Wire paths in backend/server/seed.ts and frontend/src/lib/causeHeroImages.ts"
