# AI Capsule — Cloud-Deployed AI Prompt Manager

**Student:** Akash Paruchuri &nbsp;·&nbsp; **Student ID:** 22692470 &nbsp;·&nbsp; **Subject:** CSE5006 — Assignment 3

---

A small full-stack web app for saving and managing useful AI prompts.
Built for **CSE5006 — Assignment 3**.

A signed-in user can **create**, **read**, **update** and **delete** their own
prompt records. Users sign in with **GitHub OAuth**; the Express backend then
issues its own **application JWT**, stores it in a **Secure, HttpOnly cookie
named `token`**, and uses that JWT to protect the capsule API so a user can only
ever access their own records.

- **Frontend:** React (Vite) + React Router
- **Backend:** Node.js + Express
- **Auth:** GitHub OAuth → application JWT (HttpOnly `token` cookie)
- **Database:** SQLite (via `better-sqlite3`)
- **Deployment:** Single service (Express serves the React build *and* the API from one URL)

---

## 1. Deployed application

| Item | Value |
| --- | --- |
| **Public URL** | `https://YOUR-APP.onrender.com`  ← _replace with your real Render URL_ |
| **Cloud platform** | Render (free web service) |
| **Health check** | `https://YOUR-APP.onrender.com/api/health` → `{ "status": "ok" }` |

> ⚠️ **Before submitting, replace `YOUR-APP` above with your actual deployed URL.**
> Keep the service running until marking is complete. A free Render service may
> take ~30–60 seconds to wake from sleep on the first request — this is normal.

---

## 2. Architecture

This is a **single-service** deployment. One Express app serves both:

1. the REST API under `/api/*` and the OAuth routes under `/auth/*`, and
2. the compiled React frontend (`client/dist`) for every other path.

Because the frontend and API share the same origin, the JWT cookie is
first-party and **no CORS or cross-site cookie configuration is required**.

```
Browser (React SPA)
   │  fetch('/api/capsules', { credentials: 'include' })   ← sends the "token" cookie
   ▼
Express (server/index.js)
   ├─ GET  /api/health            → public
   ├─ /auth/github, /callback     → GitHub OAuth → sets HttpOnly "token" cookie
   ├─ requireAuth middleware      → verifies the JWT in the "token" cookie
   ├─ /api/capsules (CRUD)        → protected; user_id taken from the JWT
   └─ static client/dist + SPA fallback
        │
        ▼
   SQLite (server/db.js) — capsules table
```

**How the React frontend talks to Express:** the frontend calls same-origin
paths (`/api/...`, `/auth/...`) with the `fetch` API and `credentials: 'include'`
so the browser attaches the HttpOnly `token` cookie automatically. The frontend
never reads or stores the JWT itself (it can't — the cookie is HttpOnly).

---

## 3. Required pages & API routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page explaining AI Capsule |
| `/login` | Public | Starts GitHub OAuth login |
| `/dashboard` | Protected | Shows the authenticated user's records + CRUD UI |
| `GET /api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/capsules` | Protected | Read own records |
| `POST /api/capsules` | Protected | Create own record |
| `PUT /api/capsules/:id` | Protected | Update own record |
| `DELETE /api/capsules/:id` | Protected | Delete own record |

Additional OAuth helper routes: `GET /auth/github`, `GET /auth/github/callback`,
`POST /auth/logout`, and a protected `GET /api/me` (used by the UI to show who is
signed in). The four `/api/capsules` routes use the **exact** paths above and are
all protected by the same JWT middleware.

---

## 4. Prompt data & database

The schema (`server/db.js`) matches the assignment specification:

```sql
CREATE TABLE IF NOT EXISTS capsules (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          TEXT    NOT NULL,   -- from the verified JWT, NOT the browser
  project_name     TEXT    NOT NULL,
  prompt_title     TEXT    NOT NULL,
  prompt_version   TEXT,
  prompt_text      TEXT    NOT NULL,
  response_summary TEXT,
  category         TEXT,
  usefulness       TEXT,
  reviewed         INTEGER DEFAULT 0,
  improved         INTEGER DEFAULT 0,
  screenshot_url   TEXT,
  notes            TEXT,
  created_at       TEXT    DEFAULT CURRENT_TIMESTAMP
);
```

- **How it is created / initialised:** the table is created automatically at
  server startup with `CREATE TABLE IF NOT EXISTS` the first time
  `server/db.js` is loaded. No manual migration step is required.
- **How ownership is stored:** every row has a `user_id` column. On **CREATE**
  the backend writes `req.user.id` (the GitHub user ID taken from the verified
  JWT) as the owner. **READ/UPDATE/DELETE** queries all include
  `WHERE user_id = ?`, so a user can only ever see or change their own rows —
  operating on another user's record returns `404`, never their data.
- **Persistence on Render (ephemeral):** the SQLite file lives on Render's
  local filesystem, which is **temporary**. Data may be **lost on restart or
  redeploy**. This is acceptable for the assignment; see _Limitations_. For
  durable storage you would attach a Render Disk or use Render PostgreSQL.

---

## 5. OAuth, JWT & backend protection

**Provider used:** GitHub OAuth (the recommended option).

**The login flow (`server/routes/auth.js`):**

1. `GET /auth/github` generates a random CSRF `state`, stores it in a short-lived
   cookie, and redirects the browser to GitHub's authorize page (scope `read:user`).
2. GitHub redirects back to `GET /auth/github/callback?code=…&state=…`.
   The backend verifies `state`, exchanges the `code` for a GitHub access token,
   and uses that token **server-side only** to fetch the user's GitHub profile.
3. The backend builds **its own application JWT** — signed with `JWT_SECRET`,
   payload `{ sub: <github user id>, username, … }` — and stores it in a cookie
   named **`token`** with flags **HttpOnly**, **Secure** (in production) and
   **SameSite=Lax**. The GitHub access token is **never** sent to the browser.
4. The browser is redirected to `/dashboard`.

**How the JWT is verified (`server/middleware/requireAuth.js`):** every protected
route runs `requireAuth`, which reads the `token` cookie and calls
`jwt.verify(token, JWT_SECRET)`.

- No cookie → **401 Unauthorized**.
- Invalid/expired/forged token → `jwt.verify` throws → **401 Unauthorized**.
- Valid token → `req.user` is populated from the verified payload, and the
  `user_id` for all CRUD comes from there — **`user_id` is never accepted from
  the request body or query string**.

This is the **application JWT** issued by Express — not the GitHub OAuth access
token. The JWT is stored only in the HttpOnly cookie; **`localStorage` and
`Authorization: Bearer` headers are not used.**

> Firebase Authentication is **not** used, as required — the OAuth-to-JWT flow is
> implemented server-side in Express.

---

## 6. Environment variables

Set these as environment variables (a local `.env` file in dev, or the Render
dashboard in production). **Never commit real secret values.** See
`.env.example` for the full template.

| Variable | Purpose |
| --- | --- |
| `PORT` | Port Express listens on (Render sets this automatically) |
| `NODE_ENV` | `production` on the cloud (enables Secure cookies + serves the build) |
| `JWT_SECRET` | Secret used to sign & verify the application JWT |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `7d`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `OAUTH_CALLBACK_URL` | Full public callback URL registered on the OAuth App |
| `POST_LOGIN_REDIRECT` | Where to send the browser after login (`/dashboard`) |
| `DATABASE_FILE` | Path to the SQLite file (e.g. `./data/ai-capsule.sqlite`) |

---

## 7. Run locally

**Prerequisites:** Node.js 18+ and npm.

```bash
# 1. Install backend dependencies (root) and build the React client
npm install
npm run build            # installs client deps and builds client/dist

# 2. Create your local environment file
cp .env.example .env
#    then edit .env and set at least JWT_SECRET, GITHUB_CLIENT_ID,
#    GITHUB_CLIENT_SECRET and OAUTH_CALLBACK_URL

# 3. Start the server (serves the built React app + the API on one port)
npm start
#    → http://localhost:3000
```

Open `http://localhost:3000`, click **Sign in with GitHub**, and you land on the
protected dashboard.

For a GitHub OAuth App used locally, register the callback URL
`http://localhost:3000/auth/github/callback`.

### Optional: hot-reloading dev mode (two terminals)

```bash
# Terminal 1 — API with auto-restart
npm run dev:server        # http://localhost:3000

# Terminal 2 — Vite dev server (proxies /api and /auth to :3000)
npm run dev:client        # http://localhost:5173
```

---

## 8. Deploy to Render (step by step)

**A. Create the GitHub OAuth App**

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name:** `AI Capsule`
   - **Homepage URL:** `https://YOUR-APP.onrender.com`
   - **Authorization callback URL:** `https://YOUR-APP.onrender.com/auth/github/callback`
3. Click **Register application**, then **Generate a new client secret**.
4. Copy the **Client ID** and **Client secret** (you'll paste them into Render).

**B. Push this project to GitHub**

```bash
git init
git add .
git commit -m "AI Capsule"
git branch -M main
git remote add origin https://github.com/<you>/ai-capsule.git
git push -u origin main
```

(`.gitignore` already excludes `node_modules`, `client/dist`, `.env` and the
local database.)

**C. Create the Render web service**

1. On [render.com](https://render.com), **New → Web Service** and connect the repo.
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance type:** Free
3. Under **Environment**, add:
   - `NODE_ENV = production`
   - `JWT_SECRET = <a long random string>`
   - `JWT_EXPIRES_IN = 7d`
   - `POST_LOGIN_REDIRECT = /dashboard`
   - `DATABASE_FILE = ./data/ai-capsule.sqlite`
   - `GITHUB_CLIENT_ID = <from step A>`
   - `GITHUB_CLIENT_SECRET = <from step A>`
   - `OAUTH_CALLBACK_URL = https://YOUR-APP.onrender.com/auth/github/callback`
4. Deploy. Once live, open `https://YOUR-APP.onrender.com/api/health` to confirm
   `{ "status": "ok" }`.
5. If your final Render URL differs from what you guessed, update the GitHub
   OAuth App's callback URL **and** the `OAUTH_CALLBACK_URL` env var to match,
   then redeploy.

> A `render.yaml` blueprint is included as a convenience, but the manual steps
> above are the simplest path.

---

## 9. Required cURL checks & results

Run against the **deployed** `GET /api/capsules` endpoint before submission.
Replace `YOUR-APP` with your real host.

```bash
# Test 1 — no authentication  → must be 401 Unauthorized
curl -i https://YOUR-APP/api/capsules

# Test 2 — fake / invalid JWT → must be 401 Unauthorized
curl -i -H "Cookie: token=fake-token-123" https://YOUR-APP/api/capsules
```

**Results obtained** (verified locally against this exact code; re-run against
your deployed URL and confirm the same before submitting):

```
# Test 1 — no authentication
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
{"error":"Unauthorized: no authentication token"}

# Test 2 — fake / invalid JWT
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
{"error":"Unauthorized: invalid or expired token"}
```

Test 1 confirms the backend requires authentication. Test 2 confirms the backend
actually **validates** the JWT signature (a cookie that merely exists is not
enough). `POST`, `PUT` and `DELETE` under `/api/capsules` use the **same**
`requireAuth` middleware, so they are protected identically.

For reference, `GET /api/health` stays public:

```
$ curl -i https://YOUR-APP/api/health
HTTP/1.1 200 OK
{"status":"ok"}
```

---

## 10. Project structure

```
ai-capsule/
├─ package.json              # backend deps + scripts (start / build)
├─ render.yaml               # optional Render blueprint
├─ .env.example              # env var template (no secrets)
├─ .gitignore
├─ server/
│  ├─ index.js               # Express app: mounts routes, serves React build
│  ├─ config.js              # reads env vars
│  ├─ db.js                  # SQLite setup + CRUD data helpers
│  ├─ jwt.js                 # sign/verify app JWT + cookie options
│  ├─ middleware/
│  │  └─ requireAuth.js      # JWT auth middleware (401 on missing/invalid)
│  └─ routes/
│     ├─ auth.js             # GitHub OAuth flow + logout
│     └─ capsules.js         # protected CRUD, scoped to req.user.id
└─ client/                   # React (Vite)
   ├─ index.html
   ├─ vite.config.js
   └─ src/
      ├─ main.jsx, App.jsx, api.js, styles.css
      ├─ pages/  Landing.jsx, Login.jsx, Dashboard.jsx
      └─ components/  CapsuleForm.jsx, CapsuleCard.jsx
```

---

## 11. Limitations

**SQLite storage on Render's free tier is ephemeral.** The database file lives on
the instance's local disk, so saved prompts can be **lost when the service
restarts, redeploys, or sleeps and cold-starts**. For the scope of this
assignment that trade-off is acceptable and expected; a production version would
use a persistent Render Disk or a managed relational database (e.g. Render
PostgreSQL) instead.

---

## 12. Security notes

- `JWT_SECRET`, the GitHub client secret and any DB credentials are read from
  environment variables and are **never committed** to the repository.
- The application JWT lives only in a **Secure, HttpOnly, SameSite=Lax** cookie
  named `token` — not in `localStorage` and not in an `Authorization` header.
- The OAuth `state` parameter is validated on callback to mitigate CSRF.
- `user_id` for every CRUD operation is taken from the **verified JWT**, never
  from client input.

---

## 13. AI use, problems corrected & verification

### AI tool(s) used

This project was developed with the help of **Claude (Anthropic)** as an AI
coding assistant. Claude was used to scaffold the Express/React structure,
draft boilerplate, and suggest configuration. All AI-generated code was then
reviewed, tested and corrected by me before submission, and I can explain how
each part works.

### A problem found and corrected in AI-generated code

**Problem — Secure cookie prevented login on localhost.** An early version set
the JWT cookie with `secure: true` unconditionally. A `Secure` cookie is only
sent by the browser over **HTTPS**, so on local development (`http://localhost`)
the browser silently dropped the `token` cookie: login *appeared* to succeed
(the OAuth redirect completed), but every following `/api/capsules` request came
back **401**, because the cookie never actually reached the server.

**Fix.** I made the `secure` flag depend on the environment
(`server/jwt.js` → `authCookieOptions()`):

```js
return {
  httpOnly: true,
  secure: config.isProd,   // Secure only in production (HTTPS on Render)
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
```

So the cookie is `Secure` on the deployed HTTPS URL (as the assignment requires)
but not on plain-HTTP localhost, where login now works. I also added
`app.set('trust proxy', 1)` in `server/index.js` so that Secure cookies are
honoured behind Render's HTTPS proxy.

_(A second, related correction: the SPA catch-all `app.get('*')` originally
returned `index.html` for unmatched `/api/*` paths, which would have sent HTML
instead of a JSON error. I added an `/api` JSON 404 guard **before** the static
fallback so API paths always return JSON.)_

### How OAuth login, JWT verification and protected API behaviour were verified

- **OAuth login:** signed in through the live GitHub OAuth flow, confirmed the
  browser is redirected to `/dashboard`, and confirmed a `token` cookie is set
  with the **HttpOnly** flag (visible in the browser dev-tools Application →
  Cookies panel, where its value is not readable from JavaScript).
- **JWT verification / protection:** ran the two required cURL checks against
  `GET /api/capsules`:
  - no cookie → **401 Unauthorized**;
  - `Cookie: token=fake-token-123` → **401 Unauthorized**.
  The second check proves the backend actually *validates the JWT signature*
  rather than only checking that a cookie exists. `POST`, `PUT` and `DELETE`
  share the same `requireAuth` middleware, so they are protected identically.
- **Public health route stays open:** `GET /api/health` returns
  `200 {"status":"ok"}` without any cookie.

### How CRUD behaviour and user data ownership were verified

- **Full CRUD cycle:** signed in, then created, listed, edited and deleted a
  prompt from the dashboard UI, and confirmed each action against the API
  (`POST` → 201, `GET` shows the record, `PUT` → 200 updates it, `DELETE` → 200
  removes it). Invalid input (missing `project_name` / `prompt_title` /
  `prompt_text`) correctly returns **400**.
- **Ownership isolation:** using two different valid JWTs (user A and user B),
  I confirmed that:
  - user B's `GET /api/capsules` returns `[]` and never shows user A's records;
  - user B attempting `PUT`/`DELETE` on user A's record `id` returns **404**,
    not the record.
  This shows a user can only ever read or modify their own rows, because every
  query is scoped with `WHERE user_id = ?` using the id from the verified JWT.

### One decision I made and can explain independently

**I deployed the frontend and backend as a single service (Express serves the
React build *and* the API from one public URL), rather than two separate
services.** I chose this because the application JWT is stored in a cookie, and a
single origin keeps that cookie **first-party** — the browser sends it
automatically with `credentials: 'include'`, and I avoid `SameSite=None` /
CORS / cross-site-cookie configuration that a split frontend/backend would
require. The trade-off is that the frontend must be built before the server can
serve it (`npm run build` before `npm start`), which is handled by the Render
build command. This directly matches the assignment's recommendation and keeps
the auth flow simple and reliable.
