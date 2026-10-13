#!/usr/bin/env bash
# Installs the pinned, checksum-verified agent-browser release (see
# .ai/browsers/agent-browser.md) and its Chrome for Testing build.
# Prints the binary path on the last line; in GitHub Actions it is also
# exported as AGENT_BROWSER_BIN through $GITHUB_ENV.
# Used by CI and by `npm run test:e2e` setup instructions.
set -euo pipefail

if command -v agent-browser >/dev/null 2>&1; then
  AGENT_BROWSER_BIN=$(command -v agent-browser)
else
  AGENT_BROWSER_VERSION=v0.35.2
  CACHE_ROOT=${XDG_CACHE_HOME:-"$HOME/.cache"}
  TOOL_DIR="$CACHE_ROOT/agent-tools/agent-browser/$AGENT_BROWSER_VERSION"
  mkdir -p "$TOOL_DIR"
  OS=$(uname -s 2>/dev/null || echo unknown)
  ARCH=$(uname -m 2>/dev/null || echo unknown)
  case "$ARCH" in x86_64|amd64) ARCH=x64 ;; arm64|aarch64) ARCH=arm64 ;; *) ARCH=unsupported ;; esac
  case "$OS" in
    Darwin) ASSET="agent-browser-darwin-$ARCH" ;;
    Linux)
      LIBC=linux
      (ldd --version 2>&1 || true) | grep -qi musl && LIBC=linux-musl
      ASSET="agent-browser-$LIBC-$ARCH"
      ;;
    MINGW*|MSYS*|CYGWIN*) ASSET=agent-browser-win32-x64.exe ;;
    *) ASSET=unsupported ;;
  esac
  case "$ASSET" in *unsupported*) echo "Unsupported agent-browser target: $OS/$ARCH" >&2; exit 1 ;; esac
  case "$ASSET" in
    agent-browser-darwin-arm64) ASSET_SHA256=e1e08f3b0a1c711750209e6a25b6f3a9dab7ed6e6a24b55a2556050b991fcc97 ;;
    agent-browser-darwin-x64) ASSET_SHA256=d76cfc76885d5007f3c119008a80a145b381ec4dfdd202f43e46cd0829751774 ;;
    agent-browser-linux-arm64) ASSET_SHA256=1599fec4f4e75dc26fc08eecc06ca4b729a0361932b32a6afb99885f0f829ecb ;;
    agent-browser-linux-musl-arm64) ASSET_SHA256=2e414cd0657ae086ae9b096789d7a6a3db69cb80b4b9e699ac6deab1a0c11f52 ;;
    agent-browser-linux-musl-x64) ASSET_SHA256=8395028176289e9fc5fbadd97891f97fb2ddc0d23682605a91044959788140ba ;;
    agent-browser-linux-x64) ASSET_SHA256=b699f24eebdb7fde91a34a9d697a1b84c3145f54327b60694b46f06b2972ce4d ;;
    agent-browser-win32-x64.exe) ASSET_SHA256=5ffcad90cda06114730e8b202285c45ec0866d1b8d7876b561329e4a8cfbb126 ;;
  esac
  AGENT_BROWSER_BIN="$TOOL_DIR/$ASSET"
  if [ ! -x "$AGENT_BROWSER_BIN" ]; then
    URL="https://github.com/vercel-labs/agent-browser/releases/download/$AGENT_BROWSER_VERSION/$ASSET"
    TMP="$AGENT_BROWSER_BIN.tmp.$$"
    if command -v curl >/dev/null 2>&1; then curl -fL --retry 3 --connect-timeout 30 --max-time 600 -o "$TMP" "$URL"
    elif command -v wget >/dev/null 2>&1; then wget -T 30 -t 3 -O "$TMP" "$URL"
    else echo "No built-in HTTP downloader is available" >&2; exit 1
    fi
    if command -v sha256sum >/dev/null 2>&1; then GOT_SHA256=$(sha256sum "$TMP" | awk '{print $1}')
    else GOT_SHA256=$(shasum -a 256 "$TMP" | awk '{print $1}')
    fi
    if [ "$GOT_SHA256" != "$ASSET_SHA256" ]; then
      rm -f "$TMP"
      echo "agent-browser $AGENT_BROWSER_VERSION $ASSET checksum mismatch: expected $ASSET_SHA256, got $GOT_SHA256" >&2
      exit 1
    fi
    chmod 755 "$TMP"
    mv "$TMP" "$AGENT_BROWSER_BIN"
  fi
fi

"$AGENT_BROWSER_BIN" install
if ! "$AGENT_BROWSER_BIN" doctor --json >/dev/null 2>&1; then
  if [ "$(uname -s 2>/dev/null || true)" = Linux ]; then
    if [ "$(id -u)" = 0 ]; then
      "$AGENT_BROWSER_BIN" install --with-deps
    elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
      sudo -n "$AGENT_BROWSER_BIN" install --with-deps
    fi
  fi
fi
"$AGENT_BROWSER_BIN" doctor --json >/dev/null
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "AGENT_BROWSER_BIN=$AGENT_BROWSER_BIN" >> "$GITHUB_ENV"
fi
echo "$AGENT_BROWSER_BIN"
