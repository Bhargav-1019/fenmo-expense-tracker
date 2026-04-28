const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use a temp DB for each test run
const TEST_DB_PATH = path.join(__dirname, '..', 'test_expenses.db');

// Override DB_PATH before requiring the app
process.env.DB_PATH = TEST_DB_PATH;

// Clean up any previous test DB
if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');

const app = require('../index');
const db = require('../db');

const USER_A = 'test-user-aaa';
const USER_B = 'test-user-bbb';

afterAll(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  if (fs.existsSync(TEST_DB_PATH + '-wal')) fs.unlinkSync(TEST_DB_PATH + '-wal');
  if (fs.existsSync(TEST_DB_PATH + '-shm')) fs.unlinkSync(TEST_DB_PATH + '-shm');
});

// ── Helper ─────────────────────────────────────────────────────────
function makeExpense(overrides = {}) {
  return {
    amount: 42.5,
    category: 'Food',
    description: 'Test lunch',
    date: '2026-04-28',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ────────────────────────────────────────────────────────────────────
// POST /expenses
// ────────────────────────────────────────────────────────────────────
describe('POST /expenses', () => {
  it('creates an expense and returns 201', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'key-create-1')
      .send(makeExpense());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      amount: 42.5,
      amount_paise: 4250,
      category: 'Food',
      description: 'Test lunch',
      date: '2026-04-28',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.created_at).toBeDefined();
  });

  it('stores amount as integer paise (money-safe)', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'key-paise-1')
      .send(makeExpense({ amount: 99.99 }));

    expect(res.status).toBe(201);
    expect(res.body.amount_paise).toBe(9999);
    expect(res.body.amount).toBe(99.99);
  });

  it('returns 400 when X-User-Id header is missing', async () => {
    const res = await request(app)
      .post('/expenses')
      .send(makeExpense());

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('X-User-Id header is required');
  });

  it('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ amount: undefined }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('amount is required');
  });

  it('returns 400 when amount is negative', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ amount: -10 }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('amount must be a positive number');
  });

  it('returns 400 when amount is zero', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ amount: 0 }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when category is empty', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ category: '' }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('category is required');
  });

  it('returns 400 when date format is invalid', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ date: '28-04-2026' }));

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('date must be in YYYY-MM-DD format');
  });

  it('returns 400 when date is missing', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .send(makeExpense({ date: undefined }));

    expect(res.status).toBe(400);
  });

  it('trims description and category', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'key-trim-1')
      .send(makeExpense({ category: '  Food  ', description: '  padded  ' }));

    expect(res.status).toBe(201);
    expect(res.body.category).toBe('Food');
    expect(res.body.description).toBe('padded');
  });

  it('allows empty description', async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'key-nodesc-1')
      .send(makeExpense({ description: '' }));

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('');
  });
});

// ────────────────────────────────────────────────────────────────────
// IDEMPOTENCY
// ────────────────────────────────────────────────────────────────────
describe('Idempotency', () => {
  it('replays the same response for duplicate Idempotency-Key', async () => {
    const key = 'idem-test-unique-1';
    const data = makeExpense({ amount: 77, description: 'idempotent' });

    const res1 = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', key)
      .send(data);

    const res2 = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', key)
      .send(data);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    // Same ID = same record, not a duplicate
    expect(res2.body.id).toBe(res1.body.id);
  });

  it('creates separate expenses with different keys', async () => {
    const data = makeExpense({ amount: 10, description: 'diff keys' });

    const res1 = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'diff-key-aaa')
      .send(data);

    const res2 = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'diff-key-bbb')
      .send(data);

    expect(res1.body.id).not.toBe(res2.body.id);
  });
});

// ────────────────────────────────────────────────────────────────────
// GET /expenses
// ────────────────────────────────────────────────────────────────────
describe('GET /expenses', () => {
  it('returns 400 without X-User-Id', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(400);
  });

  it('returns expenses for the authenticated user only', async () => {
    // Create expense for user B
    await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_B)
      .set('Idempotency-Key', 'userb-1')
      .send(makeExpense({ amount: 999, description: 'User B only' }));

    // User A should NOT see User B's expense
    const resA = await request(app)
      .get('/expenses')
      .set('X-User-Id', USER_A);

    const descriptions = resA.body.map((e) => e.description);
    expect(descriptions).not.toContain('User B only');

    // User B should see their own
    const resB = await request(app)
      .get('/expenses')
      .set('X-User-Id', USER_B);

    const descriptionsB = resB.body.map((e) => e.description);
    expect(descriptionsB).toContain('User B only');
  });

  it('filters by category', async () => {
    // Create a Transport expense for user A
    await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'cat-filter-1')
      .send(makeExpense({ category: 'Transport', description: 'taxi' }));

    const res = await request(app)
      .get('/expenses?category=Transport')
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    res.body.forEach((e) => {
      expect(e.category).toBe('Transport');
    });
  });

  it('returns all categories when no filter', async () => {
    const res = await request(app)
      .get('/expenses')
      .set('X-User-Id', USER_A);

    const categories = [...new Set(res.body.map((e) => e.category))];
    expect(categories.length).toBeGreaterThanOrEqual(1);
  });

  it('sorts by date descending by default', async () => {
    const res = await request(app)
      .get('/expenses')
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(200);
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].date >= res.body[i].date).toBe(true);
    }
  });

  it('sorts by date ascending when sort=date_asc', async () => {
    // Add expenses with different dates
    await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'sort-asc-1')
      .send(makeExpense({ date: '2026-01-01', description: 'old' }));

    await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'sort-asc-2')
      .send(makeExpense({ date: '2026-12-31', description: 'new' }));

    const res = await request(app)
      .get('/expenses?sort=date_asc')
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(200);
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].date <= res.body[i].date).toBe(true);
    }
  });

  it('combines category filter and sort', async () => {
    const res = await request(app)
      .get('/expenses?category=Food&sort=date_asc')
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(200);
    res.body.forEach((e) => expect(e.category).toBe('Food'));
    for (let i = 1; i < res.body.length; i++) {
      expect(res.body[i - 1].date <= res.body[i].date).toBe(true);
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// PUT /expenses/:id
// ────────────────────────────────────────────────────────────────────
describe('PUT /expenses/:id', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'put-setup-1')
      .send(makeExpense({ amount: 50, description: 'to update' }));
    expenseId = res.body.id;
  });

  it('updates an expense and returns the updated record', async () => {
    const res = await request(app)
      .put(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_A)
      .send(makeExpense({ amount: 100, description: 'updated' }));

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(100);
    expect(res.body.description).toBe('updated');
    expect(res.body.id).toBe(expenseId);
  });

  it('returns 404 for non-existent expense', async () => {
    const res = await request(app)
      .put('/expenses/non-existent-id')
      .set('X-User-Id', USER_A)
      .send(makeExpense());

    expect(res.status).toBe(404);
  });

  it('returns 404 when user tries to update another users expense', async () => {
    const res = await request(app)
      .put(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_B)
      .send(makeExpense({ amount: 999 }));

    expect(res.status).toBe(404);
  });

  it('returns 400 with invalid data', async () => {
    const res = await request(app)
      .put(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_A)
      .send({ amount: -5, category: '', date: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 400 without X-User-Id', async () => {
    const res = await request(app)
      .put(`/expenses/${expenseId}`)
      .send(makeExpense());

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────────────
// DELETE /expenses/:id
// ────────────────────────────────────────────────────────────────────
describe('DELETE /expenses/:id', () => {
  let expenseId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/expenses')
      .set('X-User-Id', USER_A)
      .set('Idempotency-Key', 'delete-setup-1')
      .send(makeExpense({ description: 'to delete' }));
    expenseId = res.body.id;
  });

  it('returns 404 when user tries to delete another users expense', async () => {
    const res = await request(app)
      .delete(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_B);

    expect(res.status).toBe(404);
  });

  it('deletes an expense and returns 204', async () => {
    const res = await request(app)
      .delete(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(204);

    // Verify it's gone
    const getRes = await request(app)
      .get('/expenses')
      .set('X-User-Id', USER_A);

    const ids = getRes.body.map((e) => e.id);
    expect(ids).not.toContain(expenseId);
  });

  it('returns 404 for already-deleted expense', async () => {
    const res = await request(app)
      .delete(`/expenses/${expenseId}`)
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent expense', async () => {
    const res = await request(app)
      .delete('/expenses/non-existent-id')
      .set('X-User-Id', USER_A);

    expect(res.status).toBe(404);
  });

  it('returns 400 without X-User-Id', async () => {
    const res = await request(app)
      .delete('/expenses/some-id');

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────────────
// DATA INTEGRITY
// ────────────────────────────────────────────────────────────────────
describe('Data integrity', () => {
  it('amount_paise is always an integer (no floating point drift)', async () => {
    const amounts = [0.01, 0.1, 1.23, 99.99, 123.45, 0.07];
    for (let i = 0; i < amounts.length; i++) {
      const res = await request(app)
        .post('/expenses')
        .set('X-User-Id', USER_A)
        .set('Idempotency-Key', `integrity-${i}`)
        .send(makeExpense({ amount: amounts[i] }));

      expect(res.status).toBe(201);
      expect(Number.isInteger(res.body.amount_paise)).toBe(true);
      expect(res.body.amount_paise).toBe(Math.round(amounts[i] * 100));
    }
  });
});
