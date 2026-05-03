import { useMemo } from 'react';
import * as d3 from 'd3';

const W = 140;
const H = 40;
const PAD = { top: 4, right: 4, bottom: 4, left: 4 };

export default function HourlyGrid({ hourly, comparisonHourly }) {
  // Display order: by total crime count, descending.
  const types = useMemo(() => {
    return Object.entries(hourly)
      .map(([type, v]) => ({ type, total: v.total }))
      .sort((a, b) => b.total - a.total)
      .map((x) => x.type);
  }, [hourly]);

  // y-axis: shared scale across all 12 panels so visual comparison works.
  // Use the max pct across all types (excluding nulls).
  const maxPct = useMemo(() => {
    let max = 0;
    Object.values(hourly).forEach((v) => {
      v.hours.forEach((h) => {
        if (h != null && h > max) max = h;
      });
    });
    if (comparisonHourly) {
      Object.values(comparisonHourly).forEach((v) => {
        v.hours.forEach((h) => {
          if (h != null && h > max) max = h;
        });
      });
    }
    return max || 10;
  }, [hourly, comparisonHourly]);

  return (
    <div className="hourly-grid">
      {types.map((type) => (
        <Spark
          key={type}
          type={type}
          hours={hourly[type].hours}
          total={hourly[type].total}
          comparison={comparisonHourly?.[type]?.hours ?? null}
          maxPct={maxPct}
        />
      ))}
    </div>
  );
}

function Spark({ type, hours, total, comparison, maxPct }) {
  // Build the line. Skip null hours (the 0/12 reporting-default buckets).
  const points = hours
    .map((pct, hour) => ({ hour, pct }))
    .filter((p) => p.pct != null);

  const x = d3.scaleLinear().domain([0, 23]).range([PAD.left, W - PAD.right]);
  const y = d3.scaleLinear().domain([0, maxPct]).range([H - PAD.bottom, PAD.top]);

  const lineGen = d3
    .line()
    .x((d) => x(d.hour))
    .y((d) => y(d.pct))
    .curve(d3.curveMonotoneX);

  // Find peak hour for the meta line.
  const peak = points.reduce((a, b) => (b.pct > a.pct ? b : a), points[0]);

  // Comparison line (citywide, when filtered by cluster).
  let comparisonPath = null;
  if (comparison) {
    const comparisonPoints = comparison
      .map((pct, hour) => ({ hour, pct }))
      .filter((p) => p.pct != null);
    comparisonPath = lineGen(comparisonPoints);
  }

  return (
    <div className="hourly-cell">
      <div className="hourly-cell-title">{toTitleCase(type)}</div>
      <div className="hourly-cell-meta">
        peaks {formatHour(peak.hour)} · n={total.toLocaleString()}
      </div>
      <svg
        className="hourly-spark"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Hourly distribution for ${type}`}
      >
        {/* Grid baseline at y=0 */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
        />
        {/* Comparison (citywide) - thin gray dashed */}
        {comparisonPath && (
          <path
            d={comparisonPath}
            fill="none"
            stroke="#9c9a92"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.6"
          />
        )}
        {/* This series */}
        <path
          d={lineGen(points)}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Peak marker */}
        <circle cx={x(peak.hour)} cy={y(peak.pct)} r="2" fill="#D85A30" />
      </svg>
    </div>
  );
}

function toTitleCase(s) {
  return s
    .split(' ')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function formatHour(h) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}
