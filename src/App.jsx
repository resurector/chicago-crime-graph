import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import ClusterMap from './components/ClusterMap.jsx';
import SignaturePanel from './components/SignaturePanel.jsx';
import HourlyGrid from './components/HourlyGrid.jsx';
import SuccessionHeatmap from './components/SuccessionHeatmap.jsx';

const DATA_URL = `${import.meta.env.BASE_URL}data/crime-dashboard.json`;
const GEO_URL = `${import.meta.env.BASE_URL}data/community-areas.geojson`;

export default function App() {
  const [data, setData] = useState(null);
  const [geo, setGeo] = useState(null);
  const [error, setError] = useState(null);

  // Selected state. selectedCluster filters the hourly grid;
  // selectedCA highlights one area on the map.
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedCA, setSelectedCA] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(DATA_URL).then((r) => {
        if (!r.ok) throw new Error(`data: ${r.status}`);
        return r.json();
      }),
      fetch(GEO_URL).then((r) => {
        if (!r.ok) throw new Error(`geojson: ${r.status}`);
        return r.json();
      }),
    ])
      .then(([d, g]) => {
        setData(d);
        setGeo(g);
      })
      .catch((e) => setError(e.message));
  }, []);

  // When a CA is selected, also surface its cluster so the right panels follow.
  const effectiveCluster = useMemo(() => {
    if (selectedCluster != null) return selectedCluster;
    if (selectedCA != null && data) {
      const ca = data.community_areas.find((x) => x.number === selectedCA);
      return ca?.cluster ?? null;
    }
    return null;
  }, [selectedCluster, selectedCA, data]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#a32d2d' }}>
        Failed to load: {error}
        <p style={{ color: '#6b6b66', fontFamily: 'Inter, sans-serif', marginTop: 16 }}>
          Make sure <code>public/data/crime-dashboard.json</code> and{' '}
          <code>public/data/community-areas.geojson</code> exist.
        </p>
      </div>
    );
  }

  if (!data || !geo) {
    return <div style={{ padding: 40, color: '#9c9a92' }}>Loading…</div>;
  }

  return (
    <>
      <Header meta={data.meta} />

      <div className="dashboard-grid">
        <div className="card map-card">
          <div className="card-title">
            <div>
              <h2>Crime regions of Chicago</h2>
              <h3>community areas, clustered by crime-mix similarity</h3>
            </div>
            <span className="card-subtitle">graph: deviation profile + KNN + Louvain</span>
          </div>
          <ClusterMap
            geo={geo}
            communityAreas={data.community_areas}
            selectedCA={selectedCA}
            selectedCluster={selectedCluster}
            onSelectCA={(n) => {
              setSelectedCA((curr) => (curr === n ? null : n));
              setSelectedCluster(null);
            }}
            onSelectCluster={(c) => {
              setSelectedCluster((curr) => (curr === c ? null : c));
              setSelectedCA(null);
            }}
          />
        </div>

        <div className="card">
          <div className="card-title">
            <div>
              <h2>Cluster signature</h2>
              <h3>
                {effectiveCluster == null
                  ? 'click a region or area to drill in'
                  : 'over- and under-represented vs. citywide'}
              </h3>
            </div>
            <span className="card-subtitle">avg deviation</span>
          </div>
          <SignaturePanel
            signatures={data.cluster_signatures}
            selectedCluster={effectiveCluster}
            selectedCA={selectedCA}
            communityAreas={data.community_areas}
            typeOrder={data.type_order}
          />
        </div>

        <div className="card full-row">
          <div className="card-title">
            <div>
              <h2>Circadian fingerprints</h2>
              <h3>
                hourly distribution per crime type
                {effectiveCluster != null ? ' (filtered to selected cluster)' : ''}
              </h3>
            </div>
            <span className="card-subtitle">hours 0 and 12 dropped (reporting defaults)</span>
          </div>
          <HourlyGrid
            hourly={
              effectiveCluster != null
                ? data.hourly_by_cluster[String(effectiveCluster)] ?? data.hourly_overall
                : data.hourly_overall
            }
            comparisonHourly={effectiveCluster != null ? data.hourly_overall : null}
          />
        </div>

        <div className="card full-row">
          <div className="card-title">
            <div>
              <h2>Crime succession on the same block</h2>
              <h3>lift vs. base rate, within 7 days, 10 most common types</h3>
            </div>
            <span className="card-subtitle">diagonal = self-reinforcement</span>
          </div>
          <SuccessionHeatmap rows={data.succession} />
        </div>
      </div>

      <footer>
        <span>
          source:{' '}
          <a href="https://data.cityofchicago.org/Public-Safety/Crimes-2026/dwme-t622">
            City of Chicago crime data
          </a>{' '}
          · graph backend: Neo4j {data.meta.num_clusters} clusters via Louvain (modularity ~0.60)
        </span>
        <span>{data.meta.total_crimes.toLocaleString()} crimes analyzed</span>
      </footer>
    </>
  );
}
