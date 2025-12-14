#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('./package.json').version")"
OUT="$ROOT/../tab-duke-$VERSION.zip"

cd "$ROOT"

if [ ! -f "dist/tailwind.min.css" ]; then
	echo "dist/tailwind.min.css is missing. Run 'npm run build-css' first." >&2
	exit 1
fi

rm -f "$OUT"

zip -r "$OUT" \
	manifest.json \
	popup.html popup.js popup.css \
	options.html options.js \
	background.js \
	src \
	dist \
	images \
	README.md \
	PrivacyPolicy.md \
	tailwind.config.js \
	package.json \
	package-lock.json \
	> /dev/null

echo "Packed extension to $OUT"
