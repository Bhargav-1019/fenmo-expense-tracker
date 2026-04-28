import { useState, useEffect, useCallback } from 'react';
import { fetchExpenses, createExpense, updateExpense, deleteExpense } from './api';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Filters from './components/Filters';
import CategorySummary from './components/CategorySummary';
import './App.css';

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('date_desc');
  const [editingExpense, setEditingExpense] = useState(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses({
        category: filterCategory || undefined,
        sort: sortOrder,
      });
      setExpenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, sortOrder]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  async function handleSubmit(data, idempotencyKey, editId) {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (editId) {
        await updateExpense(editId, data);
        setSuccessMsg('Expense updated successfully!');
        setEditingExpense(null);
      } else {
        await createExpense(data, idempotencyKey);
        setSuccessMsg('Expense added successfully!');
      }
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteExpense(id);
      setSuccessMsg('Expense deleted.');
      if (editingExpense?.id === id) {
        setEditingExpense(null);
      }
      await loadExpenses();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(expense) {
    setEditingExpense(expense);
    setError(null);
    setSuccessMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingExpense(null);
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <h1>
            <span className="logo-icon">◈</span> Fenmo
          </h1>
          <p className="tagline">Expense Tracker</p>
        </div>
      </header>

      <main className="app-main">
        <ExpenseForm
          onSubmit={handleSubmit}
          submitting={submitting}
          editingExpense={editingExpense}
          onCancelEdit={handleCancelEdit}
        />

        {successMsg && (
          <div className="success-banner">
            <p>{successMsg}</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={loadExpenses} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        <Filters
          category={filterCategory}
          onCategoryChange={setFilterCategory}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          total={total}
          count={expenses.length}
        />

        <ExpenseList
          expenses={expenses}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <CategorySummary expenses={expenses} />
      </main>

      <footer className="app-footer">
        <p>Fenmo &middot; Built for clarity, not complexity.</p>
      </footer>
    </div>
  );
}
