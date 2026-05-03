export default function Header({ meta }) {
  const range = formatRange(meta.earliest, meta.latest);

  return (
    <header className="header">
      <div>
        <h1>Chicago crime, through the graph</h1>
        <h3 style={{ marginTop: 6 }}>{range}</h3>
      </div>

      <div className="header-stats">
        <div>
          <span className="stat-num">{meta.total_crimes.toLocaleString()}</span>
          crimes
        </div>
        <div>
          <span className="stat-num">{meta.num_areas}</span>
          community areas
        </div>
        <div>
          <span className="stat-num">{meta.num_clusters}</span>
          crime regions
        </div>
      </div>
    </header>
  );
}

function formatRange(earliest, latest) {
  if (!earliest || !latest) return '';
  const e = new Date(earliest);
  const l = new Date(latest);
  const fmt = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${e.toLocaleDateString('en-US', fmt)} — ${l.toLocaleDateString('en-US', fmt)}`;
}
