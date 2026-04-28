export default function ExpenseList({ expenses, loading, onEdit, onDelete }) {
  if (loading) {
    return <div className="loading-state">Loading expenses…</div>;
  }

  if (expenses.length === 0) {
    return <div className="empty-state">No expenses found. Add one above!</div>;
  }

  return (
    <div className="expense-list-wrapper">
      <table className="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th className="text-right">Amount</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr key={exp.id}>
              <td>{formatDate(exp.date)}</td>
              <td>
                <span className={`category-badge category-${exp.category.toLowerCase()}`}>
                  {exp.category}
                </span>
              </td>
              <td className="desc-cell">{exp.description || '—'}</td>
              <td className="text-right amount-cell">₹{exp.amount.toFixed(2)}</td>
              <td className="text-center actions-cell">
                <button
                  className="btn-icon btn-edit"
                  onClick={() => onEdit(exp)}
                  title="Edit expense"
                  aria-label="Edit"
                >
                  ✎
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={() => onDelete(exp.id)}
                  title="Delete expense"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
