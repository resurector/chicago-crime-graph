import { useMemo } from 'react';
import { CLUSTER_META, clusterName } from '../lib/colors.js';

const BAR_MAX_DEV = 0.7; // hardcoded — saw -0.65 to +0.67 in our data
const TOP_N = 5;

export default function SignaturePanel({
  signatures,
  selectedCluster,
  selectedCA,
  communityAreas,
  typeOrder,
}) {
  // If a CA is directly selected, show its profile. Otherwise show the
  // cluster's averaged signature.
  const view = useMemo(() => {
    if (selectedCA != null) {
      const ca = communityAreas.find((c) => c.number === selectedCA);
      if (!ca || !ca.profile || !typeOrder) return null;
      const items = ca.profile.map((dev, i) => ({
        type: typeOrder[i],
        dev: Math.round(dev * 1000) / 1000,
      }));
      items.sort((a, b) => b.dev - a.dev);
      return {
        title: `Community area ${ca.number}`,
        subtitle: `${ca.total_crimes.toLocaleString()} crimes · ${clusterName(ca.cluster)}`,
        over: items.slice(0, TOP_N).filter((x) => x.dev > 0),
        under: items.slice(-TOP_N).filter((x) => x.dev < 0).reverse(),
        accent: ca.cluster,
      };
    }

    if (selectedCluster != null) {
      const sig = signatures.find((s) => s.cluster === selectedCluster);
      if (!sig) return null;
      return {
        title: clusterName(selectedCluster),
        subtitle: `${sig.over_represented.length + sig.under_represented.length}-type signature`,
        over: sig.over_represented.filter((x) => x.dev > 0),
        under: sig.under_represented.filter((x) => x.dev < 0),
        accent: selectedCluster,
      };
    }

    return null;
  }, [selectedCA, selectedCluster, communityAreas, signatures, typeOrder]);

  if (!view) {
    return (
      <div style={{ padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>
        Each cluster has a distinct fingerprint. Click a region in the legend to
        see what types it over- and under-represents relative to the city as a
        whole.
      </div>
    );
  }

  const meta = CLUSTER_META[view.accent];
  const overColor = meta?.color ?? '#1a1a1a';
  const underColor = '#9c9a92';

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{view.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{view.subtitle}</div>
      </div>

      {view.over.length > 0 && (
        <>
          <div className="signature-label">Over-represented</div>
          {view.over.map((item) => (
            <Bar key={`o-${item.type}`} item={item} color={overColor} side="right" />
          ))}
        </>
      )}

      {view.under.length > 0 && (
        <>
          <div className="signature-label">Under-represented</div>
          {view.under.map((item) => (
            <Bar key={`u-${item.type}`} item={item} color={underColor} side="left" />
          ))}
        </>
      )}
    </div>
  );
}

function Bar({ item, color, side }) {
  const pct = Math.min(100, (Math.abs(item.dev) / BAR_MAX_DEV) * 50);
  const style =
    side === 'right'
      ? { left: '50%', width: `${pct}%`, background: color }
      : { right: '50%', width: `${pct}%`, background: color };

  const sign = item.dev > 0 ? '+' : '';
  const display = `${sign}${item.dev.toFixed(2)}`;

  return (
    <div className="signature-row">
      <span title={item.type} style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{item.type}</span>
      <span className="signature-bar-track">
        <span className="signature-bar-fill" style={style} />
      </span>
      <span className="signature-value">{display}</span>
    </div>
  );
}
