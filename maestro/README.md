# Maestro UI tests (iOS / Android)

## Prerequisites

1. **Maestro CLI** — [Maestro](https://maestro.mobile.dev/) (`maestro --version`).
2. **Simulator / device** with **Anki Today** installed (`com.ankitoday.app`).
3. **Happy-path flows** (`smoke_home.yaml`) need the **API** reachable from the app. For the iOS Simulator on the same Mac as the backend, build the web app with:

   ```bash
   cd frontend
   REACT_APP_API_URL=http://127.0.0.1:5193 CI= npm run build
   npx cap sync
   ```

   Then build and run the app from Xcode once (or install the `.app` on the simulator).

4. Start the backend (e.g. `make dev-backend` with port **5193** mapped). Dev containers are named **`anki_mysql`** and **`anki_backend`** (`docker logs -f anki_backend`).

### iOS + Maestro limitation

`smoke_home.yaml` only asserts the **deck home** screen. Maestro can see WKWebView accessibility nodes, but **taps often do not perform in-WebView navigation** (hash links / `Router` updates), so flows that open Sign-in and return are unreliable on iOS. Exercise that path on **Android** or manually until a native/deeplink hook exists.

## Run

From the repository root, **`make maestro-test`**:

1. **Builds** the web app (`REACT_APP_API_URL` defaults to `http://127.0.0.1:5193`), runs **`npx cap sync`**, **compiles** the iOS app, and **`simctl install`s** `com.ankitoday.app` on a booted iPhone simulator (Maestro needs the app installed; `clearState` fails otherwise).
2. Boots a simulator if needed and runs Maestro with **`--device <UDID>`**.

```bash
make maestro-test              # install + smoke_home
make maestro-test-offline      # install + smoke_offline
make maestro-test-all          # install + all flows except smoke_offline (needs API)

make maestro-ios-install       # build + install only
make maestro-test-only         # Maestro only (skip rebuild; use after install)
```

Override API URL for the embedded bundle:

```bash
REACT_APP_API_URL=... make maestro-ios-install
```

Manual run (same idea):

```bash
device=$(bash scripts/maestro-ensure-ios-sim.sh)
maestro test maestro/flows/smoke_home.yaml --device "$device"
```

If Maestro times out starting the iOS driver:

```bash
export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000
make maestro-test
```

**Happy path (`smoke_home.yaml`)** needs the **backend** to allow the Capacitor WebView origin. The backend (`server.js`) allows `capacitor://localhost`, `ionic://localhost`, and `localhost` / `127.0.0.1` in addition to `FRONTEND_URL`. Override with **`CORS_EXTRA_ORIGINS`** (comma-separated) if needed.

### CocoaPods

If `npx cap sync` fails on `pod install`, set UTF-8:

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

## Flows

| File | Purpose |
|------|---------|
| `smoke_home.yaml` | Launch app, wait for home (“Your Decks”), assert header (“Logged in as”). **Requires API.** On **iOS**, in-WebView navigation is not automated (see above). |
| `smoke_offline.yaml` | Launch app, expect **identify** failure UI (“Error loading user data”). **No backend** (or wrong `REACT_APP_API_URL`). |

`make maestro-test-all` runs every flow in `maestro/flows` **except** `smoke_offline.yaml`, so it does not mix “API up” and “API down” expectations in one run. Use `make maestro-test-offline` when you want the offline flow alone.

Run the single flow that matches your environment when testing manually; `smoke_home` and `smoke_offline` expect opposite API availability.
