const CATEGORIES = [
  'Food',
  'Transport',
  'Entertainment',
  'Utilities',
  'Health',
  'Shopping',
  'Other',
];

export default function Filters({ category, onCategoryChange, sortOrder, onSortChange, total, count }) {
  return (
    <div className="filters-bar">
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="filter-category">Filter by category</label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-date">Sort by date</label>
          <select
            id="sort-date"
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
          </select>
        </div>

        {category && (
          <button
            className="btn-clear-filter"
            onClick={() => onCategoryChange('')}
            title="Clear filter"
          >
            ✕ Clear
          </button>
        )}
      </div>

      <div className="summary-box">
        <span className="summary-count">{count} expense{count !== 1 ? 's' : ''}</span>
        <span className="summary-total">Total: ₹{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
