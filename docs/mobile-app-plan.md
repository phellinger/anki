# Mobile app plan (iOS & Android): shared code, offline-first, sync

This document outlines how to extend this project—a **Create React App** frontend (MUI, React Router) and **Express + MySQL** backend—into **iOS and Android apps** with **maximum shared code**, **solid offline study**, and **merge/sync when back online**.

---

## 1. Choose the mobile shell (shared code vs. native feel)


| Approach                                                       | Shared UI                                                | Shared logic                                                   | Offline                                     | Effort                          |
| -------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| **Capacitor** (wrap existing web build in iOS/Android WebView) | **Highest** — keep MUI screens                           | High if you extract a small “domain” package                   | Good with a proper local store + sync queue | **Lowest** to ship              |
| **Expo / React Native**                                        | Lower unless you adopt RN Web or a cross-platform UI kit | **High** if you extract pure TS/JS (deck rules, weights, sync) | Excellent                                   | Higher — rebuild UI             |
| **Monorepo: Expo + react-native-web**                          | **High** long-term                                       | High                                                           | Excellent                                   | **Highest** — migration project |


**Practical recommendation**

- **Phase 1:** **Capacitor** + local-first data + sync — fastest path, maximum reuse of the existing React app.
- **Phase 2 (optional):** If you need store-grade UX (gestures, background refresh, widgets), add **Expo** and move **shared logic** into a `packages/shared` (or similar) library; reuse only that package from native.

**Phase 1 status in this repo**

| Piece | Status |
| ----- | ------ |
| Capacitor 5 in `frontend/` (`ios/`, `android/`, `capacitor.config.json`) | **Done** — `npm run cap:sync` (see repo `Makefile` **`cap-sync`**) |
| API URL for device builds (`REACT_APP_API_URL`, no CRA proxy on device) | **Done** — see `.env.prod.template` |
| Auth for native (Bearer + Preferences) | **Done** — pairs with **`docs/web-auth-plan.md` Phase D** |
| IndexedDB + outbox + offline study | **Not yet** — still required before the app is truly offline-first (§5 step 4, §7 step 3) |

**Tooling:** Capacitor 5 matches **Node 16**; newer Capacitor major versions often require **Node 18+**. On macOS, **iOS** needs **Xcode** + **CocoaPods** (`pod install` under `ios/App` if the Capacitor update step fails).

---

## 2. Offline-first data model (what must work without network)

Treat the server as **eventually consistent** with the device.

### Local store (all platforms)

- **Decks:** full document (name, headers, data) + `deckId`, `updatedAt` (from server when available).
- **Per-deck progress:** difficulties keyed by `(deckId, rowIndex)` and **deck settings** (direction, skip_easy).
- **Outbox:** append-only queue of operations: e.g. `POST difficulty`, `PUT settings`, `PUT deck`, `DELETE deck`, with stable **client-generated ids** and timestamps for ordering and idempotency.

### Storage technology

- **Web / Capacitor:** **IndexedDB** (e.g. **Dexie.js**) — survives restarts, large decks.
- **React Native:** **SQLite** (e.g. **expo-sqlite**) or **WatermelonDB** — same logical schema as above.

**Shared code opportunity:** define **TypeScript types + serialization** for “local deck snapshot” and “outbox entry” in one package used by web and (later) native.

---

## 3. Sync and merge strategy (aligned with the current API)

Current mutations are largely **per-key upserts** (difficulties by `row_index`, settings by `deck_id + user_id`), which fits merge semantics.

### Read path (online)

- Pull latest deck + difficulties + settings (same pattern as today: deck fetch + `/difficulties` + `/settings`).
- Merge into local store and bump a **local `syncedAt`** / server version if you add one.

### Write path

- **Online:** apply optimistically, enqueue + fire request, remove from outbox on success.
- **Offline:** apply locally only, **append to outbox**.

### Reconnect

- Process outbox in order (per deck, or global with deck grouping).
- On conflict, prefer **last-write-wins per field** for difficulties/settings (often acceptable for this style of app), or **max(timestamp)** if you add timestamps.

### Backend improvements (plan early)

- **Auth:** The app uses `/user/identify` while many deck routes currently resolve a **default user** in middleware. For **multi-device merge**, deck data must be tied to the **same logical user** as the client (token or signed user id). Plan a small **auth story** (JWT/session + `user_id` on all deck queries).
- **Efficiency:** add `GET /sync` or `GET /decks/:id/sync` returning deck + difficulties + settings + **ETag** / `updated_at` in one round-trip; optional `POST /sync/batch` to replay outbox.
- **Idempotency:** accept `clientMutationId` on writes so retries don’t duplicate side effects.

---

## 4. Frontend architecture changes (maximum reuse)

1. **Extract “domain” from components** — Move into shared modules: difficulty weights, row picking, deck shape helpers, anything not tied to DOM.
2. **Introduce a data layer** — Replace direct `axios` calls in screens with repositories that:
  - Read **local first**, refresh in background when online.
  - Write with **local + outbox** when needed.
3. **Connectivity** — Use `@capacitor/network` (or React Native `NetInfo`) to show sync status and **flush outbox** when online.
4. **User bootstrap offline** — Hydrate from secure storage first; run identify when online; merge theme/username.
5. **MUI / layout** — Add **safe areas** and optional **full-screen** study mode for mobile shells.

---

## 5. Capacitor-specific plan (if you prioritize max reuse first)

1. Add Capacitor to the CRA app; configure **iOS/Android**; point **API URL** at production (env). — **Done** (see Phase 1 table above).
2. Ensure **HTTPS** API; configure **CORS** / **App Transport** as needed. — **CORS** includes `Authorization`; use HTTPS in production.
3. Persist auth token / username with **Capacitor Preferences** or encrypted storage. — **Done** for session **token** (Bearer); username still from API as today.
4. Ship **IndexedDB + outbox** before calling the app “offline capable.” — **Pending**
5. Test: airplane mode, kill app mid-queue, duplicate requests (idempotency). — **After** (4)

---

## 6. Testing strategy

- **Unit:** merge rules, outbox ordering, conflict policy.
- **Integration:** mock API with flaky network (e.g. Playwright; Detox later for native).
- **Manual matrix:** first launch offline, study offline, come online, two devices same user (once auth is correct).

---

## 7. Phased rollout (suggested order)

If you commit to **Option 3** (Expo + react-native-web monorepo), use **§8.11** as the primary phased checklist; the steps below skew **Capacitor-first**.

1. **Clarify user model** — Same user across devices and deck ownership (likely requires backend + client auth).
2. **Extract shared domain + types** (optional npm workspace).
3. **Local store + outbox** in the web app; make the **study path** work fully offline in the browser.
4. **Add Capacitor** and verify parity on devices. — **Scaffold done**; parity testing once (3) lands.
5. **Harden sync** (batch endpoint, ETags, idempotency) as usage grows.
6. **Optional:** Expo app consuming the same shared package if WebView UX is not enough.

---

## Summary

**Maximum shared code in the near term:** keep the **React + MUI** app, add a **local-first layer (IndexedDB) + outbox**, wrap with **Capacitor**, and align the **backend user model** so merge-on-reconnect applies to the **correct** user.

**Maximum long-term shared logic with a native shell:** same **domain + sync package**, plus **Expo** for a second UI without duplicating study rules.

The main fork is **Capacitor-first** (time-to-ship, reuse UI) vs **Expo-first** (native UX, more UI work). Pick based on whether shipping quickly or native polish matters more.

---

## 8. Option 3 in depth: monorepo + Expo + react-native-web (best long-term quality)

This path targets **one React codebase** that renders to **web** (via **react-native-web**) and to **iOS/Android** (via **React Native** inside **Expo**). Shared **screens**, **navigation**, and **layout** live in one place; only thin platform adapters differ. Effort is front-loaded (migration, tooling, design system), but you avoid maintaining **two UI stacks** (CRA+MUI vs native) forever.

### 8.1 What you are actually building

| Layer | Role |
| ----- | ---- |
| **Expo app** | Native shell, OTA updates (optional), EAS Build for store binaries, access to `expo-secure-store`, `expo-file-system`, `expo-sqlite`, etc. |
| **react-native-web** | Lets the same `<View>`, `<Text>`, `<Pressable>` tree run in the browser (maps to DOM). Web bundle is not identical to “classic React DOM + MUI,” but **one component file** can serve all three platforms. |
| **Monorepo** | Splits **app** (Expo), **packages/ui** (or **packages/app-shared**), **packages/domain** (pure TS), **backend** (unchanged). Optional **Turborepo** for task caching. |

**What does *not* carry over:** **MUI** is built for the DOM (`div`, portals, emotion in a DOM-specific way). You do **not** run MUI inside React Native. Option 3 means **re-skinning** with a cross-platform design system (see §8.4).

### 8.2 Repository layout (example)

```
anki/
  apps/
    expo/                 # Expo entry: app.config, ios/android, metro, web/
      app/                # Expo Router (recommended) or src/ + navigation
  packages/
    domain/               # Deck types, parsers, difficulty weights, pick-next-card (no React)
    data/                 # API client, local DB adapter interface, sync + outbox (platform impls in app)
    ui/                   # Cross-platform primitives + screen compositions (RN primitives only)
  backend/                # Existing Express API (auth/sync hardening as in §3)
```

- **`packages/domain`:** zero React; easy unit tests; imported by web and native.
- **`packages/data`:** interfaces + shared logic; **SQLite** (Expo) vs **IndexedDB** (web) implemented behind one `Storage` interface, or use a library that abstracts both (heavier).
- **`packages/ui`:** only `react-native` imports (`View`, `Text`, …). **No** `react-dom`-only APIs in shared UI.

### 8.3 Navigation: one router for three surfaces

**Expo Router** (file-based, built on React Navigation) is the usual choice: **same route files** for `/`, `/deck/:id`, etc., on web and native. Deep links and share URLs work on web; native gets standard stack/tab behavior.

Alternatives: **React Navigation** without file routing (more manual parity). Avoid **react-router-dom** in shared code—it is web-centric; if you keep it temporarily for web-only, you split navigation and **duplicate** flows (works against Option 3).

### 8.4 Design system: replacing MUI

Pick **one** stack used everywhere in `packages/ui`:

| Stack | Pros | Cons |
| ----- | ---- | ---- |
| **Tamagui** | Strong web + native styling, tokens, good perf story | Learning curve; build setup |
| **NativeWind** (Tailwind for RN) | Familiar utility styling; works with RN Web | Discipline needed for consistency |
| **React Native Paper** (Material) | Material-ish, accessible components | Web story exists but less “pixel parity” than Tamagui for custom design |
| **Gluestack UI** | Component library, RN + Web | Evaluate bundle size and theming |

**Recommendation:** choose **Tamagui** or **NativeWind + a small headless component layer** if you want **full control** and long-term consistency. Rebuild **Deck list, editor, study, settings** once against tokens (spacing, typography, dark/light) so **theme** matches your current `ThemeContext` behavior conceptually.

### 8.5 Platform-specific code (keep it thin)

Use `Platform.OS === 'web'` or **`.web.tsx` / `.native.tsx`** extensions only for:

- File import/export (CSV/txt): **`<input type=file>`** on web vs **document picker** on native.
- Storage: **IndexedDB** vs **expo-sqlite** (or both via a small adapter).
- **Keyboard** shortcuts in `PlayDeck`: `Keyboard` API or `react-native-keyevent` on native vs `window` on web.

Everything else—**study flow, difficulty buttons, deck CRUD screens**—stays in shared files.

### 8.6 Offline and sync in Option 3

The **offline model in §2–3** still applies; only **storage implementations** change:

| Concern | Web | iOS / Android |
| ------- | --- | ------------- |
| Structured local data | IndexedDB (Dexie) | **expo-sqlite** or WatermelonDB |
| Secure user id / token | `localStorage` + httpOnly cookie pattern if you add auth; or encrypted wrapper | **expo-secure-store** |
| Network status | `navigator.onLine` + optional events | **@react-native-community/netinfo** (Expo includes compatible usage) |
| Background sync | Service Worker (optional, PWA); or sync on focus | Sync on app foreground + periodic task (limited on iOS) |

Implement **`packages/data/sync`** as **pure logic** (merge rules, outbox ordering) with **injectable** `fetch` and `storage`. The Expo app and the web entry each wire adapters.

### 8.7 Migration strategy (reduce risk)

**A. Strangler / parallel track (recommended)**

1. Create the **monorepo** and **`packages/domain`** — lift `deckFormat`, difficulty constants, and pure helpers from CRA **without** changing CRA yet.
2. Add **`apps/expo`** with Expo Router + one screen (“Hello”) + web build proving **react-native-web** works.
3. Port **one vertical slice**: e.g. **Play deck** only — shared UI + API; ship **web** build of Expo alongside old CRA **or** replace CRA route when ready.
4. Port **deck list → edit → import/export** in order of dependency.
5. Delete CRA when parity is verified; point production web to **Expo web** output (static hosting or SSR if you add it later).

**B. Big bang** — faster calendar time, higher regression risk; only if team is small and tests are strong.

### 8.8 Build, release, and CI

- **Native:** **EAS Build** (cloud) or local `eas build`; **EAS Submit** to App Store / Play Console; **environment** via `eas.json` + secrets.
- **Web:** `expo export -p web` (or current Expo web export command for your SDK) → deploy to same host as today (S3, Netlify, etc.).
- **Monorepo:** **pnpm** `workspace:*` deps; **Turborepo** `build`/`lint`/`test` pipelines with caching.

### 8.9 Testing

- **Jest:** `packages/domain` and sync logic.
- **React Native Testing Library:** shared screens in `packages/ui`.
- **Maestro** or **Detox:** critical native flows (study, offline queue flush).
- **Playwright:** Expo web build for regressions.

### 8.10 Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| **SEO** for marketing pages | If needed, keep a **small Next.js** or static site for landing, or Expo web with careful meta; app shell may be SPA-only. |
| **Bundle size** on web | Code-split routes; audit Tamagui/Icon deps; measure with Expo web analyzer. |
| **RN Web layout differences** | Test **study** on small phones + Safari + Chrome early; use flex-first layouts. |
| **Gesture / keyboard parity** | Define **one** shortcut story for native (explicit buttons always work). |
| **Auth** | Implement **real user sessions** before relying on multi-device sync (§3). |

### 8.11 Phased checklist (Option 3–specific)

1. **Monorepo + Expo + web** proof of life (single screen).
2. **Design tokens + theme** (dark/light) shared across web/native.
3. **`packages/domain`** extracted from legacy frontend; tests green.
4. **Data layer + offline** (outbox) with web + native storage backends.
5. **Screen parity:** Home → Play → Back; then CRUD and import/export.
6. **Auth alignment** with backend; multi-device smoke test.
7. **Retire CRA**; single deploy story for web + store releases for mobile.

### 8.12 Summary

Option 3 trades **short-term migration cost** for **one UI codebase**, **native-quality** iOS/Android, and a **clean place** for offline sync (SQLite on device, IndexedDB on web) behind shared logic. The **non-negotiable** work is **replacing MUI** with a **React Native–first design system** and **unifying navigation** under Expo Router (or equivalent). Everything else—API, sync semantics, backend hardening—overlaps with the rest of this document.