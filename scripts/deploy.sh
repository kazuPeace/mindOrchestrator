#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="/Users/kazuma/Documents/shin-rental-server/pearth.key"
HOST="pearth@pearth.wpx.jp"
PORT="10022"
TARGET="/home/pearth/pearth.wpx.jp/public_html/morc"
CONFIG="$ROOT/.env.production.local"

test -f "$CONFIG" || { echo "本番設定が見つかりません: $CONFIG" >&2; exit 1; }
grep -Eq '^VITE_GOOGLE_CLIENT_ID=.+\.apps\.googleusercontent\.com[[:space:]]*$' "$CONFIG" || { echo "VITE_GOOGLE_CLIENT_IDを.env.production.localへ設定してください。" >&2; exit 1; }
grep -Eq '^VITE_GOOGLE_API_KEY=.+[^[:space:]][[:space:]]*$' "$CONFIG" || { echo "VITE_GOOGLE_API_KEYを.env.production.localへ設定してください。" >&2; exit 1; }
grep -Eq '^VITE_GOOGLE_APP_ID=[0-9]+[[:space:]]*$' "$CONFIG" || { echo "VITE_GOOGLE_APP_IDには数値のCloudプロジェクト番号を設定してください。" >&2; exit 1; }
test -f "$KEY" || { echo "SSH鍵が見つかりません: $KEY" >&2; exit 1; }

cd "$ROOT"
npm run build
ssh -i "$KEY" -p "$PORT" "$HOST" "mkdir -p '$TARGET'"
rsync -az --delete -e "ssh -i $KEY -p $PORT" "$ROOT/dist/" "$HOST:$TARGET/"
echo "Deployed: https://pearth.wpx.jp/morc/"
