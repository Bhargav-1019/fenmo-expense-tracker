const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Per-browser user identity ──────────────────────────────────────
const USER_ID_KEY = 'fenmo_user_id';

function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

/**
 * Fetch all expenses for the current user with optional filters.
 * @param {{ category?: string, sort?: string }} params
 */
export async function fetchExpenses({ category, sort } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (sort) params.set('sort', sort);
  const qs = params.toString();
  const url = `${API_BASE}/expenses${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { 'X-User-Id': getUserId() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.errors?.join(', ') || 'Failed to fetch expenses');
  }
  return res.json();
}

/**
 * Create a new expense. Sends an Idempotency-Key header to prevent duplicates.
 * @param {{ amount: number, category: string, description: string, date: string }} data
 * @param {string} idempotencyKey
 */
export async function createExpense(data, idempotencyKey) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'X-User-Id': getUserId(),
    },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.errors?.join(', ') || 'Failed to create expense');
  }
  return body;
}

/**
 * Update an existing expense.
 * @param {string} id
 * @param {{ amount: number, category: string, description: string, date: string }} data
 */
export async function updateExpense(id, data) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
    },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.errors?.join(', ') || 'Failed to update expense');
  }
  return body;
}

/**
 * Delete an expense by ID.
 * @param {string} id
 */
export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE',
    headers: { 'X-User-Id': getUserId() },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.errors?.join(', ') || 'Failed to delete expense');
  }
}
