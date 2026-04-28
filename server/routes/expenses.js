const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// ── Prepared statements ────────────────────────────────────────────
const insertExpense = db.prepare(`
  INSERT INTO expenses (id, user_id, amount_paise, category, description, date)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const updateExpense = db.prepare(`
  UPDATE expenses SET amount_paise = ?, category = ?, description = ?, date = ?
  WHERE id = ? AND user_id = ?
`);

const deleteExpense = db.prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`);

const getExpenseByIdAndUser = db.prepare(`SELECT * FROM expenses WHERE id = ? AND user_id = ?`);

const getIdempotencyKey = db.prepare(
  `SELECT response FROM idempotency_keys WHERE key = ?`
);

const insertIdempotencyKey = db.prepare(
  `INSERT INTO idempotency_keys (key, response) VALUES (?, ?)`
);

// ── Extract user_id from X-User-Id header ──────────────────────────
function getUserId(req, res) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    res.status(400).json({ errors: ['X-User-Id header is required'] });
    return null;
  }
  return userId.trim();
}

// ── Shared validation ──────────────────────────────────────────────
function validateExpenseBody(body) {
  const errors = [];
  const { amount, category, description, date } = body;

  if (amount === undefined || amount === null) {
    errors.push('amount is required');
  } else if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
    errors.push('amount must be a positive number');
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('category is required');
  }

  if (!date || typeof date !== 'string') {
    errors.push('date is required (YYYY-MM-DD)');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push('date must be in YYYY-MM-DD format');
  }

  return errors;
}

// ── Helper: format row → response object ───────────────────────────
function formatExpense(r) {
  return {
    id: r.id,
    amount: r.amount_paise / 100,
    amount_paise: r.amount_paise,
    category: r.category,
    description: r.description,
    date: r.date,
    created_at: r.created_at,
  };
}

// ── POST /expenses ─────────────────────────────────────────────────
router.post('/', (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const idempotencyKey = req.headers['idempotency-key'];

  // Check idempotency replay
  if (idempotencyKey) {
    const existing = getIdempotencyKey.get(idempotencyKey);
    if (existing) {
      const parsed = JSON.parse(existing.response);
      return res.status(parsed.status).json(parsed.body);
    }
  }

  // --- Validation ---
  const errors = validateExpenseBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { amount, category, description, date } = req.body;

  // Convert to paise (integer cents). Round to avoid floating-point drift.
  const amountPaise = Math.round(amount * 100);
  const id = uuidv4();
  const desc = (description || '').trim();
  const cat = category.trim();

  try {
    insertExpense.run(id, userId, amountPaise, cat, desc, date);
  } catch (err) {
    console.error('DB insert error:', err.message);
    return res.status(500).json({ errors: ['Failed to save expense'] });
  }

  const expense = {
    id,
    amount: amountPaise / 100,
    amount_paise: amountPaise,
    category: cat,
    description: desc,
    date,
    created_at: new Date().toISOString(),
  };

  const responsePayload = { status: 201, body: expense };

  // Store idempotency record
  if (idempotencyKey) {
    try {
      insertIdempotencyKey.run(idempotencyKey, JSON.stringify(responsePayload));
    } catch {
      // Ignore duplicate key race — the expense was already created
    }
  }

  return res.status(201).json(expense);
});

// ── GET /expenses ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { category, sort } = req.query;

  let sql = 'SELECT * FROM expenses WHERE user_id = ?';
  const params = [userId];

  if (category && category.trim().length > 0) {
    sql += ' AND category = ?';
    params.push(category.trim());
  }

  if (sort === 'date_asc') {
    sql += ' ORDER BY date ASC, created_at ASC';
  } else {
    // Default: newest first
    sql += ' ORDER BY date DESC, created_at DESC';
  }

  try {
    const rows = db.prepare(sql).all(...params);
    const expenses = rows.map(formatExpense);
    return res.json(expenses);
  } catch (err) {
    console.error('DB query error:', err.message);
    return res.status(500).json({ errors: ['Failed to fetch expenses'] });
  }
});

// ── PUT /expenses/:id ──────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { id } = req.params;

  // Check if expense exists AND belongs to this user
  const existing = getExpenseByIdAndUser.get(id, userId);
  if (!existing) {
    return res.status(404).json({ errors: ['Expense not found'] });
  }

  // --- Validation ---
  const errors = validateExpenseBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const { amount, category, description, date } = req.body;
  const amountPaise = Math.round(amount * 100);
  const desc = (description || '').trim();
  const cat = category.trim();

  try {
    updateExpense.run(amountPaise, cat, desc, date, id, userId);
  } catch (err) {
    console.error('DB update error:', err.message);
    return res.status(500).json({ errors: ['Failed to update expense'] });
  }

  const updated = getExpenseByIdAndUser.get(id, userId);
  return res.json(formatExpense(updated));
});

// ── DELETE /expenses/:id ───────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const { id } = req.params;

  const existing = getExpenseByIdAndUser.get(id, userId);
  if (!existing) {
    return res.status(404).json({ errors: ['Expense not found'] });
  }

  try {
    deleteExpense.run(id, userId);
  } catch (err) {
    console.error('DB delete error:', err.message);
    return res.status(500).json({ errors: ['Failed to delete expense'] });
  }

  return res.status(204).end();
});

module.exports = router;
