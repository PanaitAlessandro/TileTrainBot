#!/usr/bin/env bash
# TileTrainBot installer for macOS.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/PanaitAlessandro/tiletrainbot/main/install.sh | bash
#
# Downloads the latest signed/unsigned .dmg from GitHub Releases, mounts it,
# copies TileTrainBot.app to /Applications, removes the quarantine flag so the
# app opens on first run (self-signed builds only).

set -euo pipefail

REPO="${TILETRAINBOT_REPO:-PanaitAlessandro/tiletrainbot}"
APP_NAME="TileTrainBot.app"
DEST="/Applications"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "This installer is for macOS. Use install.ps1 on Windows." >&2
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64) ARCH_TAG="aarch64";;
  x86_64) ARCH_TAG="x64";;
  *) echo "Unsupported arch: $ARCH" >&2; exit 1;;
esac

echo "→ Fetching latest TileTrainBot release ($ARCH_TAG)…"
API="https://api.github.com/repos/${REPO}/releases/latest"
URL="$(curl -fsSL "$API" \
  | grep -oE "\"browser_download_url\": *\"[^\"]*\.dmg\"" \
  | grep -E "${ARCH_TAG}|universal" \
  | head -1 \
  | sed -E 's/.*"(https[^"]+)".*/\1/')"

if [[ -z "${URL:-}" ]]; then
  echo "No .dmg asset found for arch=${ARCH_TAG} in ${REPO}. Falling back to any .dmg." >&2
  URL="$(curl -fsSL "$API" \
    | grep -oE "\"browser_download_url\": *\"[^\"]*\.dmg\"" \
    | head -1 \
    | sed -E 's/.*"(https[^"]+)".*/\1/')"
fi

if [[ -z "${URL:-}" ]]; then
  echo "No release asset found. Check https://github.com/${REPO}/releases" >&2
  exit 1
fi

TMP="$(mktemp -d)"
DMG="$TMP/tiletrainbot.dmg"
echo "→ Downloading $URL"
curl -fL --progress-bar -o "$DMG" "$URL"

echo "→ Mounting DMG…"
MOUNT="$(hdiutil attach -nobrowse -readonly "$DMG" | awk '/\/Volumes\//{for (i=3;i<=NF;i++) printf "%s ", $i; print ""}' | sed 's/ *$//')"

if [[ -z "$MOUNT" || ! -d "$MOUNT/$APP_NAME" ]]; then
  echo "Could not find $APP_NAME inside mounted DMG at '$MOUNT'" >&2
  hdiutil detach "$MOUNT" >/dev/null 2>&1 || true
  exit 1
fi

echo "→ Installing to ${DEST}…"
rm -rf "$DEST/$APP_NAME"
cp -R "$MOUNT/$APP_NAME" "$DEST/"
hdiutil detach "$MOUNT" >/dev/null

echo "→ Removing quarantine attribute…"
xattr -dr com.apple.quarantine "$DEST/$APP_NAME" 2>/dev/null || true

rm -rf "$TMP"
echo "✔ TileTrainBot installed. Open with: open -a TileTrainBot"
