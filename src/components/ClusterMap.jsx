import { useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { CLUSTER_META, CLUSTER_ORDER, clusterColor } from '../lib/colors.js';

export default function ClusterMap({
  geo,
  communityAreas,
  selectedCA,
  selectedCluster,
  onSelectCA,
  onSelectCluster,
}) {
  const svgRef = useRef(null);

  // Index CA by number for O(1) lookup during render.
  const caByNumber = useMemo(() => {
    const m = new Map();
    communityAreas.forEach((c) => m.set(c.number, c));
    return m;
  }, [communityAreas]);

  // Cluster counts for the legend.
  const clusterCounts = useMemo(() => {
    const counts = new Map();
    communityAreas.forEach((c) => {
      counts.set(c.cluster, (counts.get(c.cluster) || 0) + 1);
    });
    return counts;
  }, [communityAreas]);

  // Build the projection once, fitted to the viewBox.
  const { paths, viewBox } = useMemo(() => {
    if (!geo) return { paths: [], viewBox: '0 0 600 700' };

    // Width/height before projection — actual values set by fitSize.
    const w = 600;
    const h = 700;
    const projection = d3.geoMercator().fitSize([w - 20, h - 20], geo);
    const pathGen = d3.geoPath(projection);

    const out = geo.features.map((f) => {
      // The Chicago portal uses 'area_numbe' (truncated) and sometimes
      // 'area_num_1' as the integer-valued key. Try both.
      const numStr =
        f.properties.area_numbe ??
        f.properties.area_num_1 ??
        f.properties.AREA_NUMBE;
      const number = numStr != null ? parseInt(numStr, 10) : null;
      const name = f.properties.community ?? f.properties.COMMUNITY ?? '';
      const ca = number != null ? caByNumber.get(number) : null;
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

  // Tooltip via native title for now — keep it simple. (Could swap for a
  // floating div later if we want richer hover.)

  return (
    <div>
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map of Chicago community areas, colored by crime cluster"
      >
        {paths.map((p) => {
          const isSelected = selectedCA === p.number;
          const isInDimmedCluster =
            selectedCluster != null && p.cluster !== selectedCluster;
          const isInOtherSelectedCA = selectedCA != null && !isSelected;

          const cls = [
            'area',
            isSelected ? 'selected' : '',
            isInDimmedCluster || isInOtherSelectedCA ? 'dimmed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const fill = clusterColor(p.cluster);

          return (
            <path
              key={p.number ?? Math.random()}
              d={p.d}
              fill={fill}
              className={cls}
              onClick={() => onSelectCA(p.number)}
            >
              <title>{`${p.name} (CA ${p.number}) — ${p.total.toLocaleString()} crimes`}</title>
            </path>
          );
        })}

        {paths
          .filter((p) => p.area > 2500 && p.name && !isNaN(p.centroid[0]))
          .map((p) => (
            <text
              key={`lbl-${p.number}`}
              className="map-label"
              x={p.centroid[0]}
              y={p.centroid[1]}
              pointerEvents="none"
            >
              {p.name}
            </text>
          ))}
      </svg>

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
              style={{ background: meta.light, borderColor: selectedCluster === id ? meta.color : 'transparent' }}
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
