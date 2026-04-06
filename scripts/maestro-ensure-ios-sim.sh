#!/usr/bin/env bash
# Print UDID of a booted iOS Simulator, or boot the first available iPhone simulator and print its UDID.
set -euo pipefail

booted_udid="$(xcrun simctl list devices booted 2>/dev/null | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1 || true)"
if [[ -n "${booted_udid}" ]]; then
  echo "${booted_udid}"
  exit 0
fi

pick_iphone_udid_json() {
  python3 - <<'PY' 2>/dev/null || true
import json, subprocess, sys
try:
    out = subprocess.check_output(
        ["xcrun", "simctl", "list", "devices", "-j"], timeout=60
    )
    data = json.loads(out)
except (subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
    sys.exit(1)
for _runtime, devices in data.get("devices", {}).items():
    for d in devices:
        if not d.get("isAvailable", True):
            continue
        name = (d.get("name") or "")
        if "iphone" not in name.lower():
            continue
        u = d.get("udid")
        if u:
            print(u)
            raise SystemExit(0)
sys.exit(1)
PY
}

udid="$(pick_iphone_udid_json || true)"
if [[ -z "${udid}" ]]; then
  line="$(xcrun simctl list devices available 2>/dev/null | grep -i 'iphone' | grep -E '\([A-F0-9a-f-]{36}\)' | head -1 || true)"
  if [[ -n "${line}" ]]; then
    udid="$(echo "${line}" | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}' | head -1)"
  fi
fi

if [[ -z "${udid}" ]]; then
  echo "No iPhone simulator found. Install Xcode and an iOS Simulator (Xcode → Settings → Platforms)." >&2
  exit 1
fi

xcrun simctl boot "${udid}" 2>/dev/null || true
open -a Simulator 2>/dev/null || true
# Give Simulator time to attach XCTest driver (Maestro).
sleep 3
echo "${udid}"
