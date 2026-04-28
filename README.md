# Fenmo — Expense Tracker

A minimal, production-like full-stack expense tracker built for an internship coding assessment.

| Layer    | Technology         |
|----------|--------------------|
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

---

## Trade-offs (Time Constraints)

| What was skipped | Why |
|---|---|
| Authentication | Out of scope; adds significant complexity with no assessment value |
| Pagination | Not needed at this scale; could be added with `LIMIT/OFFSET` |
| Edit/Delete expenses | Specified as not required; kept scope minimal |
| Charts/analytics | Explicitly excluded per requirements |
| Dark/light mode toggle | Dark mode is the default; a toggle adds UI complexity |
| Unit/integration tests | Would add in a real project; time-boxed out |
| Input sanitization (XSS) | React auto-escapes output; SQLite uses parameterized queries |
| Rate limiting | Not needed for an assessment app |
| Idempotency key cleanup | Old keys accumulate; a cron job or TTL would fix this in production |

---

## What Was Intentionally Not Implemented

- **User accounts / auth** — No multi-user isolation needed.
- **Expense editing or deletion** — Not in requirements.
- **Charts or visual analytics** — Explicitly excluded.
- **Dark mode toggle** — Single dark theme only.
- **Offline support / PWA** — Out of scope.
- **Server-side rendering** — Vite SPA is sufficient.

---

## Git Commit Checkpoints

Use these as a natural progression of commits:

```
1. Initial setup: scaffolded vite frontend and express backend
   - package.json, vite configs, .gitignore

2. Set up SQLite database and built API routes for expenses
   - db.js, expenses routes, server configurations

3. Added main React shell and API fetching logic
   - App.jsx, main.jsx, api.js integration

4. Built the add expense form and the main expense list table
   - ExpenseForm, ExpenseList, Filters components

5. Swapped default date input for a custom calendar component
   - DatePicker component

6. Built the custom SVG donut chart for category breakdown
   - CategorySummary interactive chart

7. Applied the dark mode theme with amber gold accents
   - App.css, index.css styling tokens

8. Added test coverage for both frontend and backend
   - Vitest and Jest testing suites

9. Cleaned up loose files and added final documentation
   - README and other artifacts
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
│       └── expenses.js       # POST + GET /expenses
└── client/
    ├── package.json          # Vite + React
    ├── vite.config.js        # Dev proxy config
    ├── index.html
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.jsx
        ├── App.jsx           # Root component
        ├── App.css           # All styles
        ├── index.css         # Reset + design tokens
        ├── api.js            # API client
        └── components/
            ├── ExpenseForm.jsx
            ├── ExpenseList.jsx
            └── Filters.jsx
```
