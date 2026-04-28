# Fenmo — Expense Tracker

A minimal, production-like full-stack expense tracker built for an internship coding assessment.

| Layer    | Technology         |
|----------|-------------------|
| Frontend | React + Vite       |
| Backend  | Node.js + Express  |
| Database | SQLite (better-sqlite3) |
| Styling  | Plain CSS (dark mode) |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Run locally (both server + client)

```bash
# 1. Install root dependencies (Express, SQLite, etc.)
npm install

# 2. Install client dependencies
cd client && npm install && cd ..

# 3. Start both server (port 3001) and client (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

### Run backend only

```bash
npm run dev:server
# → http://localhost:3001
```

### Run frontend only

```bash
npm run dev:client
# → http://localhost:5173 (proxies API to :3001)
```

### Production build

```bash
npm run build       # builds client/dist
npm start           # serves API + static files on :3001
```

---

## Features Checklist

| # | Feature | Status |
|---|---------|--------|
| 1 | Add expense (amount, category, description, date) | ✅ |
| 2 | View all expenses in a table | ✅ |
| 3 | Filter expenses by category | ✅ |
| 4 | Sort by date (newest first) | ✅ |
| 5 | Show total of visible expenses | ✅ |
| 6 | Edit an existing expense | ✅ |
| 7 | Delete an expense (with confirm dialog) | ✅ |
| 8 | POST /expenses API | ✅ |
| 9 | GET /expenses API with query params | ✅ |
| 10 | PUT /expenses/:id API | ✅ |
| 11 | DELETE /expenses/:id API | ✅ |
| 12 | Idempotency (Idempotency-Key header) | ✅ |
| 13 | Amount stored as paise (integer) | ✅ |
| 14 | created_at in data model | ✅ |
| 15 | Data persistence (SQLite) | ✅ |
| 16 | Loading states | ✅ |
| 17 | Error handling with retry | ✅ |
| 18 | Success messages (auto-dismiss) | ✅ |
| 19 | Client-side form validation | ✅ |
| 20 | Disable submit while saving | ✅ |
| 21 | Category breakdown summary | ✅ |
| 22 | Clear filters button | ✅ |
| 23 | Responsive design | ✅ |
| 24 | Clean professional UI | ✅ |

---

## API Reference

### `POST /expenses`

Create a new expense.

| Field       | Type   | Required | Notes                      |
|-------------|--------|----------|----------------------------|
| amount      | number | ✅       | Positive, in rupees (e.g. 42.50) |
| category    | string | ✅       | e.g. "Food", "Transport"   |
| description | string | ❌       | Free text, max 200 chars   |
| date        | string | ✅       | Format: YYYY-MM-DD         |

**Headers:**
- `Idempotency-Key: <uuid>` — prevents duplicate submissions on retry/reload.

**Response:** `201 Created` with the expense object.

### `GET /expenses`

Fetch all expenses.

| Param    | Type   | Notes                              |
|----------|--------|------------------------------------|
| category | string | Filter by exact category match     |
| sort     | string | `date_desc` — newest first (default) |

**Response:** JSON array of expense objects.

### `PUT /expenses/:id`

Update an existing expense. Same body as POST.

**Response:** `200 OK` with the updated expense object.  
**Error:** `404` if expense not found.

### `DELETE /expenses/:id`

Delete an expense by ID.

**Response:** `204 No Content` on success.  
**Error:** `404` if expense not found.

### `GET /health`

Health check. Returns `{ "status": "ok" }`.

---

## Design Decisions

1. **Amount stored as integer (paise/cents)**  
   The `amount_paise` column is an `INTEGER` in SQLite. This avoids floating-point rounding errors when summing money. The API accepts `amount` as a decimal (e.g. `42.50`) and converts to paise internally via `Math.round(amount * 100)`. Responses include both `amount` (decimal) and `amount_paise` (integer).

2. **Idempotency via `Idempotency-Key` header**  
   The client generates a UUID per form submission and sends it as a header. The server stores the key and response in an `idempotency_keys` table. On duplicate submission, the server replays the original response instead of creating a duplicate expense.

3. **Frontend double-submit prevention**  
   The submit button is disabled while the request is in-flight (`submitting` state). Combined with idempotency keys, this provides two layers of protection.

4. **SQLite with WAL mode**  
   WAL (Write-Ahead Logging) allows concurrent reads while a write is in progress — important for responsive UI even under load.

5. **Vite proxy in development**  
   The Vite dev server proxies `/expenses` and `/health` to `localhost:3001`, eliminating CORS issues during development. In production, Express serves the static build directly.

6. **Server-side sorting as default**  
   Expenses are always returned newest-first (`ORDER BY date DESC, created_at DESC`). This keeps the frontend simple — no client-side sort logic needed.

7. **Category filter is server-side**  
   Filtering by category is done via a SQL `WHERE` clause, not client-side JS filtering. This is more efficient and more correct at scale.

8. **Edit uses inline form, not a modal**  
   Clicking edit scrolls to the form and pre-fills it. This reuses the existing form component and avoids modal complexity.

9. **Delete requires confirmation**  
   `window.confirm()` prevents accidental deletes. Simple and reliable.

---

## Trade-offs (Time Constraints)

| What was skipped | Why |
|---|---|
| Authentication | Out of scope; adds significant complexity with no assessment value |
| Pagination | Not needed at this scale; could be added with `LIMIT/OFFSET` |
| Charts/analytics | Explicitly excluded per requirements |
| Dark/light mode toggle | Dark mode is the default; a toggle adds UI complexity |
| Unit/integration tests | Would add in a real project; time-boxed out |
| Input sanitization (XSS) | React auto-escapes output; SQLite uses parameterized queries |
| Rate limiting | Not needed for an assessment app |
| Idempotency key cleanup | Old keys accumulate; a cron job or TTL would fix this in production |

---

## What Was Intentionally Not Implemented

- **User accounts / auth** — No multi-user isolation needed.
- **Charts or visual analytics** — Explicitly excluded.
- **Dark mode toggle** — Single dark theme only.
- **Offline support / PWA** — Out of scope.
- **Server-side rendering** — Vite SPA is sufficient.

---

## Deployment

### Option A: Railway / Render (Full-stack on one service)

1. Push to GitHub.
2. Create a new Web Service on [Railway](https://railway.app) or [Render](https://render.com).
3. Set the **Build Command**: `cd client && npm install && npm run build`
4. Set the **Start Command**: `NODE_ENV=production node server/index.js`
5. Set environment variable `PORT` (Railway/Render provide this automatically).
6. The server will serve both the API and the static frontend from `client/dist`.

> **Note:** SQLite persists to disk. On Railway, use a persistent volume mounted to the project root. On Render, use a persistent disk attached to your service. Without persistent storage, the DB resets on each deploy.

### Option B: Vercel (Frontend) + Railway (Backend)

1. Deploy the `client/` folder to [Vercel](https://vercel.com):
   - Set root directory to `client`
   - Framework: Vite
   - Build command: `npm run build`
   - Output: `dist`
   - Set env var: `VITE_API_URL=https://your-railway-backend.up.railway.app`
2. Deploy the root project to Railway as the backend (see Option A, but skip the build step).

---

## Git Commit Checkpoints

Use these as a natural progression of commits:

```
1. feat: initialize project structure with Vite + Express
   - package.json (root + client)
   - .gitignore
   - vite.config.js with proxy

2. feat: add SQLite schema and database setup
   - server/db.js with expenses + idempotency_keys tables
   - WAL mode, indexes

3. feat: implement POST /expenses with validation and idempotency
   - server/routes/expenses.js (POST handler)
   - Amount stored as paise
   - Idempotency-Key header support

4. feat: implement GET /expenses with category filter and sort
   - server/routes/expenses.js (GET handler)
   - Query params: category, sort=date_desc

5. feat: implement PUT /expenses/:id and DELETE /expenses/:id
   - Edit and delete support with validation and 404 handling

6. feat: add Express server entry point
   - server/index.js
   - CORS, JSON parsing, health check, production static serving

7. feat: build expense form with add/edit modes and validation
   - client/src/components/ExpenseForm.jsx
   - client/src/api.js

8. feat: build expense list table with edit/delete actions
   - client/src/components/ExpenseList.jsx

9. feat: add category filter, clear button, and total summary
   - client/src/components/Filters.jsx

10. feat: add category breakdown summary component
    - client/src/components/CategorySummary.jsx

11. feat: wire up App with full CRUD, success messages, error handling
    - client/src/App.jsx
    - Loading, error, submitting, success states

12. style: add dark mode design system and responsive CSS
    - client/src/index.css + App.css

13. docs: add README with setup, decisions, and deployment guide
```

---

## Project Structure

```
fenmo/
├── package.json              # Root: Express + concurrently
├── .gitignore
├── README.md
├── server/
│   ├── index.js              # Express entry point
│   ├── db.js                 # SQLite setup + schema
│   └── routes/
│       └── expenses.js       # POST + GET + PUT + DELETE /expenses
└── client/
    ├── package.json          # Vite + React
    ├── vite.config.js        # Dev proxy config
    ├── tsconfig.json         # Vite 8 compatibility
    ├── index.html
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.jsx
        ├── App.jsx           # Root component (state + CRUD)
        ├── App.css           # All styles
        ├── index.css         # Reset + design tokens
        ├── api.js            # API client (create, update, delete, fetch)
        └── components/
            ├── ExpenseForm.jsx     # Add + Edit form
            ├── ExpenseList.jsx     # Table with actions
            ├── Filters.jsx         # Category filter + clear + total
            └── CategorySummary.jsx # Per-category breakdown
```
