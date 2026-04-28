import { useState, useRef, useEffect } from 'react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function DatePicker({ value, onChange, id }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Parse value (YYYY-MM-DD) into viewing month
  const selected = value ? parseDate(value) : null;
  const [viewYear, setViewYear] = useState(selected?.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() || new Date().getMonth());

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  // Sync view to selected value when it changes externally (e.g. edit mode)
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function selectDay(day) {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const today = new Date();
  const todayStr = formatDate(today);

  function isSelected(day) {
    if (!day || !value) return false;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return value === `${viewYear}-${mm}-${dd}`;
  }

  function isToday(day) {
    if (!day) return false;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return todayStr === `${viewYear}-${mm}-${dd}`;
  }

  // Format display value
  const displayValue = value ? formatDisplay(value) : '';

  return (
    <div className="datepicker" ref={ref}>
      <button
        type="button"
        id={id}
        className="datepicker-input"
        onClick={() => setOpen(!open)}
        aria-label="Pick a date"
      >
        <span className={displayValue ? 'datepicker-value' : 'datepicker-placeholder'}>
          {displayValue || 'Select date'}
        </span>
        <span className="datepicker-icon">📅</span>
      </button>

      {open && (
        <div className="datepicker-dropdown">
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav" onClick={prevMonth} aria-label="Previous month">‹</button>
            <span className="datepicker-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="datepicker-nav" onClick={nextMonth} aria-label="Next month">›</button>
          </div>

          <div className="datepicker-weekdays">
            {DAYS.map((d) => (
              <span key={d} className="datepicker-weekday">{d}</span>
            ))}
          </div>

          <div className="datepicker-grid">
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                className={
                  'datepicker-cell' +
                  (day ? '' : ' empty') +
                  (isSelected(day) ? ' selected' : '') +
                  (isToday(day) && !isSelected(day) ? ' today' : '')
                }
                onClick={() => day && selectDay(day)}
                disabled={!day}
                tabIndex={day ? 0 : -1}
              >
                {day || ''}
              </button>
            ))}
          </div>

          <div className="datepicker-footer">
            <button
              type="button"
              className="datepicker-today-btn"
              onClick={() => {
                const t = new Date();
                setViewYear(t.getFullYear());
                setViewMonth(t.getMonth());
                selectDay(t.getDate());
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDisplay(str) {
  const d = parseDate(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
