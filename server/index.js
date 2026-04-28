const express = require('express');
const cors = require('cors');
const path = require('path');

const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API routes ─────────────────────────────────────────────────────
app.use('/expenses', expensesRouter);

// ── Health check ───────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Serve frontend in production ───────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── Start (only when run directly, not when imported for tests) ────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
