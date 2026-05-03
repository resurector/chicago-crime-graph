import { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CLUSTER_META, CLUSTER_ORDER, clusterColor, clusterName } from '../lib/colors.js';

export default function ClusterMap({
  geo,
  communityAreas,
  selectedCA,
  selectedCluster,
  onSelectCA,
  onSelectCluster,
}) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // { number, name, cluster, total, x, y }

  const caByNumber = useMemo(() => {
    const m = new Map();
    communityAreas.forEach((c) => m.set(c.number, c));
    return m;
  }, [communityAreas]);

  const clusterCounts = useMemo(() => {
    const counts = new Map();
    communityAreas.forEach((c) => {
      counts.set(c.cluster, (counts.get(c.cluster) || 0) + 1);
    });
    return counts;
  }, [communityAreas]);

  const { paths, viewBox } = useMemo(() => {
    if (!geo) return { paths: [], viewBox: '0 0 600 700' };

    const w = 600;
    const h = 700;
    const projection = d3.geoMercator().fitSize([w - 20, h - 20], geo);
    const pathGen = d3.geoPath(projection);

    const out = geo.features.map((f) => {
      const numStr =
        f.properties.area_numbe ??
        f.properties.area_num_1 ??
        f.properties.AREA_NUMBE;
      const number = numStr != null ? parseInt(numStr, 10) : null;
      const rawName = f.properties.community ?? f.properties.COMMUNITY ?? '';
      const name = toTitleCase(rawName);
      const ca = number != null ? caByNumber.get(number) : null;
      // Centroid in projected pixels, and the polygon's projected area in px²
      // (used to decide whether the polygon is big enough to label).
      const centroid = pathGen.centroid(f);
      const area = pathGen.area(f);
      return {
        number,
        name,
        cluster: ca?.cluster ?? null,
        total: ca?.total_crimes ?? 0,
        d: pathGen(f),
        centroid,
        area,
      };
    });

    return { paths: out, viewBox: `0 0 ${w} ${h}` };
  }, [geo, caByNumber]);

  // Track cursor relative to the wrap div, not the SVG, so tooltip placement
  // works regardless of how the SVG scales inside its container.
  const handlePathMouseMove = (e, p) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      number: p.number,
      name: p.name,
      cluster: p.cluster,
      total: p.total,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handlePathLeave = () => setHover(null);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg
        className="map-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map of Chicago community areas, colored by crime cluster"
        onMouseLeave={handlePathLeave}
      >
        {paths.map((p) => {
          const isSelected = selectedCA === p.number;
          const isInDimmedCluster =
            selectedCluster != null && p.cluster !== selectedCluster;
          const isInOtherSelectedCA = selectedCA != null && !isSelected;
          const isHovered = hover?.number === p.number;

          const cls = [
            'area',
            isSelected ? 'selected' : '',
            isHovered ? 'hovered' : '',
            isInDimmedCluster || isInOtherSelectedCA ? 'dimmed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <path
              key={p.number ?? Math.random()}
              d={p.d}
              fill={clusterColor(p.cluster)}
              className={cls}
              onClick={() => onSelectCA(p.number)}
              onMouseMove={(e) => handlePathMouseMove(e, p)}
              onMouseEnter={(e) => handlePathMouseMove(e, p)}
            />
          );
        })}

        {/* Labels rendered in a separate layer above the polygons.
            Threshold of ~1500 px² is roughly the smallest area that fits
            a community-area name without overlapping its neighbors. */}
        <g className="map-labels" pointerEvents="none">
          {paths
            .filter((p) => p.area > 1500 && p.centroid && Number.isFinite(p.centroid[0]))
            .map((p) => (
              <text
                key={`label-${p.number}`}
                x={p.centroid[0]}
                y={p.centroid[1]}
                className="map-label"
              >
                {p.name}
              </text>
            ))}
        </g>
      </svg>

      {hover && <Tooltip hover={hover} containerRef={wrapRef} />}

      <div className="map-legend">
        {CLUSTER_ORDER.map((id) => {
          const meta = CLUSTER_META[id];
          const count = clusterCounts.get(id) ?? 0;
          return (
            <button
              type="button"
              key={id}
              className={`map-legend-item ${selectedCluster === id ? 'active' : ''}`}
              onClick={() => onSelectCluster(id)}
              aria-pressed={selectedCluster === id}
            >
              <span
                className="map-legend-swatch"
                style={{ background: meta.color }}
              />
              <span className="map-legend-name">{meta.name}</span>
              <span className="map-legend-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tooltip({ hover, containerRef }) {
  // Position the tooltip 12px to the right and above the cursor.
  // If we're near the right edge, flip to the left of the cursor instead.
  const containerWidth = containerRef.current?.clientWidth ?? 600;
  const TOOLTIP_WIDTH = 200;
  const flipLeft = hover.x + 12 + TOOLTIP_WIDTH > containerWidth;
  const left = flipLeft ? hover.x - 12 - TOOLTIP_WIDTH : hover.x + 12;
  const top = Math.max(8, hover.y - 50);

  const meta = CLUSTER_META[hover.cluster];
  const swatch = meta?.color ?? '#888';

  return (
    <div className="map-tooltip" style={{ left, top, width: TOOLTIP_WIDTH }}>
      <div className="map-tooltip-name">{hover.name}</div>
      <div className="map-tooltip-meta">CA {hover.number}</div>
      <div className="map-tooltip-row">
        <span className="map-tooltip-swatch" style={{ background: swatch }} />
        <span className="map-tooltip-cluster">{clusterName(hover.cluster)}</span>
      </div>
      <div className="map-tooltip-count">{hover.total.toLocaleString()} crimes</div>
    </div>
  );
}

function toTitleCase(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => {
      // Handle apostrophes (O'HARE -> O'Hare)
      if (w.includes("'")) {
        return w
          .split("'")
          .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''))
          .join("'");
      }
      return w[0]?.toUpperCase() + w.slice(1);
    })
    .join(' ');
}
