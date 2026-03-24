# Authentication plan: anonymous-first, email verification, optional password

This document plans **web-first** authentication with a **single backend contract** suitable for **native mobile** (Expo / Option 3) later—same endpoints and payloads; clients differ only in how they **store** the session (cookies vs secure token storage).

**Product goal:** lowest friction onboarding—users study immediately as an anonymous user, then **register** when they want decks and progress tied to a **verified email**. **Sign in** on another device uses the same identity.

**Code touchpoints today:** random usernames from `backend/src/services/usernameGenerator.js` (word pair + **3-digit suffix**), `/user/identify`, deck data by `user_id` in MySQL (`backend/src/server.js`). Frontend: `UserContext`, `Register.js`, `UserInfo.js`.

---

## 1. Product principles

| Principle | Meaning |
| --------- | ------- |
| **Start immediately** | Every new visitor gets a **persistent anonymous account** with a random **username** (`SportAnimal` + **3 random digits**, e.g. `SoccerFox042`) without forms. |
| **Register when ready** | **Register** verifies **email** with a **4-digit OTP**, then lets the user **set a display username** (default = current random name), optionally set a **password**. |
| **Verified email** | Registration **sends** a **4-digit code** to the inbox; the account is not fully registered until the code is confirmed (same digit length as sign-in OTP for consistency). |
| **New device** | **Sign in** uses **one identifier** (see below) + **4-digit OTP** *or* **password** when applicable. After success, the client **remembers** the session. |
| **Minimal forms** | **Fewest text fields:** prefer **one** identifier field where possible; optional **Use password** reveals only what is needed. |

### 1.1 Identifier for sign-in: email **or** username

Users can sign in with **either** their **email** or their **username** in a **single** field. The server detects which it is (e.g. contains `@` → email; else treat as username) or tries lookup order (document the rule in API).

### 1.2 Shared-machine caveat (UI copy)

Anonymous identity is bound to **this browser / app install**. On a shared device, another profile = another anonymous user. **Register** and **Sign in** are how users keep data across devices.

---

## 2. OTP standard (4 digits)

| Setting | Choice |
| ------- | ------ |
| **Length** | **4 digits** (0000–9999) |
| **Expiry** | **10 minutes** (tunable) |
| **Attempts** | Rate-limit verify attempts per identifier + IP (e.g. 5 per 15 minutes) |
| **Storage** | Hash code at rest (e.g. SHA-256 of code + secret pepper); single-use; clear on success |
| **Registration vs sign-in** | **Same OTP mechanics**; different email templates / `purpose` field (`registration` \| `login`) |

---

## 3. User states (conceptual)

1. **Anonymous** — `user_id`, random `username` (with 3-digit suffix), no verified `email`.
2. **Pending registration** — Email submitted; OTP sent; not yet verified (optional intermediate state in DB or ephemeral store keyed by session).
3. **Registered (passwordless)** — Verified `email`, no `password_hash`. Sign-in via **OTP** (or add password later).
4. **Registered (with password)** — Verified `email` + `password_hash`. Sign-in via **password** or **OTP**.

---

## 4. Flows

### 4.1 First visit (anonymous “login”)

1. Client calls **`POST /user/identify`** (or **`POST /auth/bootstrap`**) with optional hints + session.
2. Server creates user with `generateUsername()` → **word pair + 3-digit suffix**; sets session; returns `{ username, theme, isNew }`.
3. Deck routes use **`req.userId`** from session (no global default user; see §8).

### 4.2 Register (from anonymous)

**Minimal multi-step UI (few fields per screen):**

1. **Email** — User enters email only. Optional: single checkbox **Use password**; if checked, show **password** + **confirm** on the same step (or next step—keep one primary action per screen if preferred).
2. **`POST /auth/register/otp/request`** — Send **4-digit OTP** to that email; purpose `registration`. Rate-limit.
3. **Code** — Single field for **4 digits** (numeric keyboard on mobile).
4. **`POST /auth/register/otp/verify`** — Validates code + ties email to **current** anonymous `user_id` (pending completion).
5. **Username** — **One** field: **display username**, **default** = existing random username (pre-filled). User may edit. **`POST /auth/register/complete`** with `{ username, password? }` — uniqueness check on `username`; set `password_hash` if provided.
6. Session refreshed; user is registered.

**Edge cases**

- Email already on another account → error before or at verify step.
- OTP wrong / expired → clear error; allow resend with cooldown.

### 4.3 Sign in (existing account)

**Single screen philosophy:**

- **One field:** “**Email or username**”
- **Primary path:** Button **Send sign-in code** → **`POST /auth/otp/request`** with `identifier` (email or username resolved server-side to user + mail to their **email**).
- **Optional:** Checkbox **Use password** → show **one** password field; submit **`POST /auth/password`** with `identifier` + `password`.

**Verify OTP (sign-in):**

- One field: **4-digit code** → **`POST /auth/otp/verify`** with `purpose: login` + session establishment.

**Remember:** Long-lived session (web: httpOnly cookie; mobile: **access + refresh tokens** or long-lived opaque token—see §7).

### 4.4 Data continuity

Anonymous → registered: **same `user_id`** throughout; decks stay attached. Register **complete** only updates `username` / `email` / `password_hash` on that row.

---

## 5. Sessions and clients

### 5.1 Web

| Mechanism | Role |
| --------- | ---- |
| **HTTP-only session cookie** | Opaque session id after bootstrap / sign-in / register complete |
| **axios** | `withCredentials: true`; CORS with **credentials** + explicit **origin** |

### 5.2 Mobile (future)

Native apps should use the **same** JSON endpoints; **do not rely on browser cookies** as the only mechanism.

| Approach | Notes |
| -------- | ----- |
| **Access + refresh JWT** (or opaque tokens) | Issued on successful bootstrap / OTP verify / password login; **refresh** rotates access; stored in **expo-secure-store** |
| **Same OTP/password payloads** | Request body identical to web; only `Authorization` header differs |

Document token lifetimes and refresh in OpenAPI or this doc when implemented.

---

## 6. Database (high level)

**`users`**

- `username` — unique, user-editable at end of registration (default anonymous name)
- `email` — nullable until registered; unique where not null
- `password_hash` — nullable
- `email_verified_at` — set when registration OTP succeeds

**`sessions`** — web: session id → `user_id`, `expires_at`

**`login_otps`**

- `email`, `purpose` (`registration` \| `login`), `code_hash`, `expires_at`, `consumed_at`
- Registration OTP may target an email not yet stored on `users` until verify—store pending email in row or separate `pending_registrations` if cleaner

**Indexes:** unique `username`, unique `email` where set; index OTP by `email` + `purpose` + `expires_at`.

---

## 7. API sketch

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/auth/bootstrap` or `/user/identify` | Anonymous user + session |
| `POST` | `/auth/register/otp/request` | Body: `{ email }`; send **4-digit** registration OTP |
| `POST` | `/auth/register/otp/verify` | Body: `{ email, code }`; mark email verified for session user |
| `POST` | `/auth/register/complete` | Body: `{ username, password? }`; finalize |
| `POST` | `/auth/otp/request` | Body: `{ identifier }` (email or username); **login** OTP to user’s email |
| `POST` | `/auth/otp/verify` | Body: `{ identifier?, code, purpose }`; establish session |
| `POST` | `/auth/password` | Body: `{ identifier, password }` |
| `POST` | `/auth/logout` | Invalidate session / revoke tokens |
| `GET` | `/user/me` | Profile + flags: `hasPassword`, `emailVerified`, etc. |

**Resolver helper:** `resolveUserFromIdentifier(string)` → user row or 404.

**Deck routes:** `user_id` from session (web) or `Authorization` bearer (mobile).

---

## 8. Frontend work (summary)

| Area | Work |
| ---- | ---- |
| **Register** | Stepwise: email → OTP → username (default filled) → optional password already captured or one checkbox step |
| **Sign in** | One **identifier** field; **Send code** vs **Use password** + **password** |
| **OTP input** | Single input, 4 digits, large touch targets (mobile-ready) |
| **`UserInfo`** | Links: **Sign in** \| **Register**; show username |
| **`api.js`** | `withCredentials: true` for web |

---

## 9. Email delivery

- **Registration** and **sign-in** both send **4-digit** codes (different templates).
- Transactional provider + env secrets; **dev:** log code to server console or fixed test code behind flag.

---

## 10. Security checklist

- Rate limit: all OTP **request** and **verify** endpoints; password attempts
- Normalize email (trim, lowercase)
- 4-digit space is small—**strict** rate limits + lockout backoff; optional CAPTCHA after repeated failures (later)
- CORS + credentials for web; **HTTPS** for `Secure` cookies

---

## 11. Implementation phases

**Phase A — Foundation**

- Session + `user_id` on deck routes; remove blanket **AnkiStudent** default
- Username format: **3-digit suffix** in `generateUsername()` (done in code)
- Bootstrap + `/user/me`

**Phase B — Registration OTP + complete**

- `register/otp/*` + `register/complete` with **username** defaulting to current
- Wire Register UI (minimal steps)

**Phase C — Sign in**

- Identifier (email or username) + login OTP + password path
- **Token response shape** for mobile (optional in same phase or Phase D)

**Phase D — Mobile**

- Same APIs; add **Bearer** issuance for native clients; Expo secure storage

---

## 12. Open decisions (short)

1. **Username rules:** allowed charset, length, reserved names, change username after register (v2).
2. **Token format:** opaque vs JWT for mobile (refresh rotation either way).
3. **“Forgot password”:** same as login OTP when `password_hash` exists, or separate flow.

---

## 13. Relation to mobile plan (`docs/mobile-app-plan.md`)

- **Single backend** for web and Expo; only **transport** of session differs (cookies vs tokens).
- **4-digit OTP** works well on mobile (SMS-like UX; one input).
- **Minimal fields** reduces layout work on small screens.
