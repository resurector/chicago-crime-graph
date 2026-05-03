import { useMemo } from 'react';
import * as d3 from 'd3';

const TOP_N = 10;
const CELL = 50;
const MARGIN = { top: 110, right: 20, bottom: 20, left: 165 };

export default function SuccessionHeatmap({ rows }) {
  const { labels, matrix } = useMemo(() => {
    // Rank from_types by total transitions, take top N.
    const totals = new Map();
    rows.forEach((r) => {
      totals.set(r.from_type, (totals.get(r.from_type) ?? 0) + r.transitions);
    });
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([t]) => t);

    const idx = new Map(top.map((t, i) => [t, i]));
    const m = Array.from({ length: top.length }, () =>
      Array.from({ length: top.length }, () => 0)
    );

    rows.forEach((r) => {
      if (idx.has(r.from_type) && idx.has(r.to_type) && r.lift != null) {
        m[idx.get(r.from_type)][idx.get(r.to_type)] = r.lift;
      }
    });

    return { labels: top, matrix: m };
  }, [rows]);

  const w = labels.length * CELL + MARGIN.left + MARGIN.right;
  const h = labels.length * CELL + MARGIN.top + MARGIN.bottom;

  // Two-piece scale: cool below 1 (chance), warm above.
  const lo = d3.scaleLinear().domain([0.2, 1]).range(['#85B7EB', '#F1EFE8']);
  const hi = d3.scaleLinear().domain([1, 9]).range(['#F1EFE8', '#993C1D']);
  const color = (v) => (v < 1 ? lo(v) : hi(v));
  const textColor = (v) => (v >= 3 || v < 0.5 ? '#fff' : '#2C2C2A');

  return (
    <div className="heatmap-wrap">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>Lift</span>
        {[
          { v: 0.5, c: '#B5D4F4' },
          { v: 1.0, c: '#F1EFE8' },
          { v: 2.0, c: '#F0997B' },
          { v: 5.0, c: '#993C1D' },
        ].map(({ v, c }) => (
          <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: c, borderRadius: 2, display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {v === 1 ? '1.0 (chance)' : v}
            </span>
          </span>
        ))}
      </div>

      <svg
        className="heatmap-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ width: '100%', height: 'auto', maxWidth: w }}
        role="img"
        aria-label="Heatmap of crime-type succession lift on the same block within seven days"
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {matrix.map((row, i) =>
            row.map((v, j) => (
              <g key={`${i}-${j}`}>
                <rect
                  x={j * CELL}
                  y={i * CELL}
                  width={CELL - 1}
                  height={CELL - 1}
                  rx={2}
                  fill={color(v)}
                />
                <text
                  x={j * CELL + CELL / 2}
                  y={i * CELL + CELL / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={i === j ? 600 : 400}
                  fill={textColor(v)}
                >
                  {v.toFixed(1)}
                </text>
              </g>
            ))
          )}

          {labels.map((label, i) => (
            <text
              key={`row-${i}`}
              x={-8}
              y={i * CELL + CELL / 2 + 4}
              textAnchor="end"
              fontSize="11"
              fill="#3d3d3a"
            >
              {label}
            </text>
          ))}

          {labels.map((label, j) => (
            <text
              key={`col-${j}`}
              transform={`translate(${j * CELL + CELL / 2}, -8) rotate(-45)`}
              textAnchor="start"
              fontSize="11"
              fill="#3d3d3a"
            >
              {label}
            </text>
          ))}
        </g>

        <text x={MARGIN.left - 8} y={MARGIN.top - 75} fontSize="11" fill="#9c9a92" textAnchor="end">
          first crime ↓
        </text>
        <text x={MARGIN.left + 4} y={MARGIN.top - 90} fontSize="11" fill="#9c9a92">
          next crime →
        </text>
      </svg>
    </div>
  );
}
