// Cluster IDs from Louvain output: 5, 17, 45, 50
// Names and colors based on the over/under signatures we saw.
//
// Color choices:
//   - 5  (Theft Belt)        : amber. Property crime, downtown/affluent.
//   - 45 (Violence)          : coral/red-orange. Battery + assault dominant.
//   - 50 (MV Theft)          : purple. Distinct, less common.
//   - 17 (Quiet Edges)       : teal. Low-intensity, fraud-leaning.

export const CLUSTER_META = {
  5:  { name: 'Theft belt',     short: 'Theft',     color: '#BA7517', light: '#FAEEDA', dark: '#854F0B' },
  45: { name: 'Violence belt',  short: 'Violence',  color: '#D85A30', light: '#FAECE7', dark: '#993C1D' },
  50: { name: 'Auto theft band',short: 'Auto',      color: '#7F77DD', light: '#EEEDFE', dark: '#534AB7' },
  17: { name: 'Quiet edges',    short: 'Quiet',     color: '#1D9E75', light: '#E1F5EE', dark: '#0F6E56' },
};

export const CLUSTER_ORDER = [5, 45, 50, 17];

export function clusterColor(id) {
  return CLUSTER_META[id]?.color ?? '#888';
}

export function clusterName(id) {
  return CLUSTER_META[id]?.name ?? `Cluster ${id}`;
}
