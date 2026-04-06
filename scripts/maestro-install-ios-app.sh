#!/usr/bin/env bash
# Build the Capacitor web bundle, sync, compile the iOS app, and install com.ankitoday.app on the target simulator.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

# Default API URL for native bundle (simulator → host Mac). Override for other setups.
export REACT_APP_API_URL="${REACT_APP_API_URL:-http://127.0.0.1:5193}"
# HashRouter is required for in-app navigation in the Capacitor WebView (see App.js).
export REACT_APP_USE_HASH_ROUTER="${REACT_APP_USE_HASH_ROUTER:-1}"

DEVICE="${1:-}"
if [[ -z "${DEVICE}" ]]; then
  DEVICE="$(bash "${ROOT}/scripts/maestro-ensure-ios-sim.sh")"
fi
if [[ -z "${DEVICE}" ]]; then
  echo "No simulator UDID (pass as first argument or boot an iPhone simulator)." >&2
  exit 1
fi

echo "Building web + syncing Capacitor (REACT_APP_API_URL=${REACT_APP_API_URL})..."
cd "${ROOT}/frontend"
CI= npm run build
npx cap sync

echo "Installing CocoaPods (if needed)..."
cd "${ROOT}/frontend/ios/App"
pod install

echo "Building iOS app for simulator ${DEVICE}..."
xcodebuild -workspace App.xcworkspace -scheme App \
  -destination "platform=iOS Simulator,id=${DEVICE}" \
  -configuration Debug \
  -derivedDataPath "${ROOT}/frontend/ios/App/dd" \
  build

APP="${ROOT}/frontend/ios/App/dd/Build/Products/Debug-iphonesimulator/App.app"
if [[ ! -d "${APP}" ]]; then
  echo "Expected app bundle not found: ${APP}" >&2
  exit 1
fi

echo "Installing ${APP} on simulator ${DEVICE}..."
xcrun simctl install "${DEVICE}" "${APP}"
echo "Done. Bundle com.ankitoday.app is on the simulator."
