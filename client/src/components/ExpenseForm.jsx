import { useState, useEffect } from 'react';
import DatePicker from './DatePicker';

const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Health',
  'Shopping',
  'Other',
];

function generateKey() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function ExpenseForm({ onSubmit, submitting, editingExpense, onCancelEdit }) {
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [errors, setErrors] = useState([]);

  // When editingExpense changes, populate the form
  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setDescription(editingExpense.description || '');
      setDate(editingExpense.date);
      setErrors([]);
    }
  }, [editingExpense]);

  function resetForm() {
    setAmount('');
    setDescription('');
    setDate(today);
    setCategory(CATEGORIES[0]);
    setErrors([]);
  }

  function validate() {
    const errs = [];
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) errs.push('Amount must be a positive number');
    if (!category) errs.push('Category is required');
    if (!date) errs.push('Date is required');
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const key = generateKey();
    const data = {
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      category,
      description: description.trim(),
      date,
    };

    await onSubmit(data, key, editingExpense?.id || null);
    resetForm();
  }

  function handleCancel() {
    resetForm();
    onCancelEdit();
  }

  const isEditing = !!editingExpense;

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
        {isEditing && (
          <button type="button" className="btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="amount">Amount (₹)</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <DatePicker id="date" value={date} onChange={setDate} />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            placeholder="Optional note..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting
          ? (isEditing ? 'Saving...' : 'Adding...')
          : (isEditing ? 'Save Changes' : 'Add Expense')}
      </button>
    </form>
  );
}
