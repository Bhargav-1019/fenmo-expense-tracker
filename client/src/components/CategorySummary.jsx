import { useState, useMemo } from 'react';

// Fixed colors per category — matches badge colors
const CATEGORY_COLORS = {
  Food: '#fb923c',
  Transport: '#38bdf8',
  Entertainment: '#e879f9',
  Utilities: '#a3e635',
  Health: '#34d399',
  Shopping: '#f9a8d4',
  Other: '#94a3b8',
};

const FALLBACK_COLORS = ['#6c63ff', '#f87171', '#fbbf24', '#60a5fa', '#c084fc', '#22d3ee'];

function getColor(category, index) {
  return CATEGORY_COLORS[category] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function CategorySummary({ expenses }) {
  if (expenses.length === 0) return null;

  const { entries, total } = useMemo(() => {
    const summary = {};
    let total = 0;
    for (const exp of expenses) {
      if (!summary[exp.category]) summary[exp.category] = 0;
      summary[exp.category] += exp.amount;
      total += exp.amount;
    }
    const entries = Object.entries(summary).sort((a, b) => b[1] - a[1]);
    return { entries, total };
  }, [expenses]);

  const [selected, setSelected] = useState(null);
  const activeCategory = selected || entries[0]?.[0] || null;
  const activeAmount = entries.find(([c]) => c === activeCategory)?.[1] || 0;
  const activePercent = total > 0 ? ((activeAmount / total) * 100).toFixed(1) : 0;

  return (
    <div className="category-summary">
      <h3>Category Breakdown</h3>
      <div className="chart-layout">
        <DonutChart
          entries={entries}
          total={total}
          selected={activeCategory}
          onSelect={setSelected}
          activeAmount={activeAmount}
          activePercent={activePercent}
        />
        <Legend
          entries={entries}
          total={total}
          selected={activeCategory}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;

function polarToXY(cx, cy, r, deg) {
  const rad = (deg - 90) * DEG_TO_RAD;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// Build an annular sector path with small rounded corners
function annularSectorPath(cx, cy, outerR, innerR, startDeg, endDeg, cornerR) {
  const sweep = endDeg - startDeg;
  if (sweep <= 0) return '';

  // Clamp corner radius so it doesn't exceed half the thickness or half the arc length
  const thickness = outerR - innerR;
  const midR = (outerR + innerR) / 2;
  const arcLen = (sweep * DEG_TO_RAD) * midR;
  const maxCorner = Math.min(thickness / 2, arcLen / 2, cornerR);
  const cr = Math.max(0, maxCorner);

  // If corner radius is negligible, draw sharp corners
  if (cr < 0.5) {
    const [ox1, oy1] = polarToXY(cx, cy, outerR, startDeg);
    const [ox2, oy2] = polarToXY(cx, cy, outerR, endDeg);
    const [ix1, iy1] = polarToXY(cx, cy, innerR, endDeg);
    const [ix2, iy2] = polarToXY(cx, cy, innerR, startDeg);
    const la = sweep > 180 ? 1 : 0;
    return [
      `M ${ox1} ${oy1}`,
      `A ${outerR} ${outerR} 0 ${la} 1 ${ox2} ${oy2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${la} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');
  }

  // Angular offset for corner radius on outer and inner arcs
  const outerCornerAngle = (cr / outerR) * (180 / Math.PI);
  const innerCornerAngle = (cr / innerR) * (180 / Math.PI);

  // Outer arc: inset by corner angle at both ends
  const outerStart = startDeg + outerCornerAngle;
  const outerEnd = endDeg - outerCornerAngle;

  // Inner arc: inset by corner angle at both ends
  const innerStart = startDeg + innerCornerAngle;
  const innerEnd = endDeg - innerCornerAngle;

  // Key points
  const [osX, osY] = polarToXY(cx, cy, outerR, outerStart);     // outer arc start
  const [oeX, oeY] = polarToXY(cx, cy, outerR, outerEnd);       // outer arc end
  const [isX, isY] = polarToXY(cx, cy, innerR, innerEnd);       // inner arc start (reversed)
  const [ieX, ieY] = polarToXY(cx, cy, innerR, innerStart);     // inner arc end (reversed)

  // Corner control points (where the straight radial line meets the arc)
  const [cos1X, cos1Y] = polarToXY(cx, cy, outerR, startDeg);   // outer corner start outer-point
  const [cis1X, cis1Y] = polarToXY(cx, cy, innerR, startDeg);   // inner corner start inner-point
  const [cos2X, cos2Y] = polarToXY(cx, cy, outerR, endDeg);     // outer corner end outer-point
  const [cis2X, cis2Y] = polarToXY(cx, cy, innerR, endDeg);     // inner corner end inner-point

  const outerSweep = outerEnd - outerStart;
  const innerSweep = innerEnd - innerStart;
  const laOuter = outerSweep > 180 ? 1 : 0;
  const laInner = innerSweep > 180 ? 1 : 0;

  return [
    // Start at outer arc start (after start corner)
    `M ${osX} ${osY}`,
    // Outer arc
    outerSweep > 0.1
      ? `A ${outerR} ${outerR} 0 ${laOuter} 1 ${oeX} ${oeY}`
      : '',
    // End corner: outer → inner at end side (rounded)
    `Q ${cos2X} ${cos2Y} ${isX} ${isY}`,
    // Inner arc (reverse direction)
    innerSweep > 0.1
      ? `A ${innerR} ${innerR} 0 ${laInner} 0 ${ieX} ${ieY}`
      : '',
    // Start corner: inner → outer at start side (rounded)
    `Q ${cis1X} ${cis1Y} ${osX} ${osY}`,
    'Z',
  ].filter(Boolean).join(' ');
}

// ── Donut Chart ────────────────────────────────────────────────────
function DonutChart({ entries, total, selected, onSelect, activeAmount, activePercent }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 98;
  const innerR = 64;
  const cornerRadius = 5;
  const gapDeg = entries.length > 1 && 0;

  // Build segments with gaps
  const segments = [];
  let angle = 0;
  const totalGap = gapDeg * entries.length;
  const usable = 360 - totalGap;

  for (let i = 0; i < entries.length; i++) {
    const [cat, amount] = entries[i];
    const frac = total > 0 ? amount / total : 0;
    const sweep = frac * usable;
    const start = angle + gapDeg / 2;
    const end = start + sweep;
    angle += sweep + gapDeg;

    segments.push({ category: cat, start, end, color: getColor(cat, i) });
  }

  return (
    <div className="donut-container">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        {segments.map((seg) => {
          const d = annularSectorPath(cx, cy, outerR, innerR, seg.start, seg.end, cornerRadius);
          if (!d) return null;
          return (
            <path
              key={seg.category}
              d={d}
              fill={seg.color}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                transformOrigin: `${cx}px ${cy}px`,
                transform: seg.category === selected ? 'scale(1.05)' : 'scale(1)',
              }}
              onClick={() => onSelect(seg.category)}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <span className="donut-center-category">{selected || entries[0]?.[0]}</span>
        <span className="donut-center-amount">₹{activeAmount.toFixed(2)}</span>
        <span className="donut-center-percent">{activePercent}%</span>
      </div>
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────
function Legend({ entries, total, selected, onSelect }) {
  return (
    <div className="chart-legend">
      {entries.map(([cat, amount], i) => {
        const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
        const isActive = cat === selected;
        return (
          <button
            key={cat}
            className={`legend-item ${isActive ? 'legend-active' : ''}`}
            onClick={() => onSelect(cat)}
          >
            <span className="legend-dot" style={{ background: getColor(cat, i) }} />
            <span className="legend-label">{cat}</span>
            <span className="legend-pct">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}
