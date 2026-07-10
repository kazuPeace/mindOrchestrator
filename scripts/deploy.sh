#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="/Users/kazuma/Documents/shin-rental-server/pearth.key"
HOST="pearth@pearth.wpx.jp"
PORT="10022"
TARGET="/home/pearth/pearth.wpx.jp/public_html/morc"

test -d "$ROOT/dist" || { echo "dist がありません。先に npm run build を実行してください。" >&2; exit 1; }
test -f "$KEY" || { echo "SSH鍵が見つかりません: $KEY" >&2; exit 1; }

ssh -i "$KEY" -p "$PORT" "$HOST" "mkdir -p '$TARGET'"
rsync -az --delete -e "ssh -i $KEY -p $PORT" "$ROOT/dist/" "$HOST:$TARGET/"
echo "Deployed: https://pearth.wpx.jp/morc/"
