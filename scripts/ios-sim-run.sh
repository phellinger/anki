#!/usr/bin/env bash
# Boot/open an iPhone Simulator, build + install the Capacitor app (same pipeline as maestro-ios-install), then launch it.
#
# Why use this instead of Xcode ⌘R?
# - Guarantees `npm run build` + `npx cap sync` ran so `ios/App/App/public` matches the JS bundle (stale/missing web assets → black WebView).
# - Installs the same Debug .app this script builds via xcodebuild; Xcode can otherwise use a different DerivedData copy.
#
# Needs API for a normal UI: `make dev-backend` (default http://127.0.0.1:5193). Override: REACT_APP_API_URL=... make ios-sim-run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE="$(bash "${ROOT}/scripts/maestro-ensure-ios-sim.sh")" || exit 1
echo "Simulator: ${DEVICE}"

open -a Simulator 2>/dev/null || true
sleep 1

bash "${ROOT}/scripts/maestro-install-ios-app.sh" "${DEVICE}"

xcrun simctl terminate "${DEVICE}" com.ankitoday.app 2>/dev/null || true
echo "Launching com.ankitoday.app..."
xcrun simctl launch "${DEVICE}" com.ankitoday.app
open -a Simulator 2>/dev/null || true
echo ""
echo "If the WebView stays black: enable Safari → Settings → Advanced → Show Develop menu, then Develop → [your simulator] → capacitor:// — Web Inspector shows JS/load errors."
echo "Ensure the API is up (e.g. make dev-backend) if the app hangs on identify."
