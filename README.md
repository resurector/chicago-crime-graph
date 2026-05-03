# Chicago Crime Dashboard

A static React dashboard exploring Chicago crime data through a Neo4j graph model.

Built around three findings surfaced from the graph:

1. **Circadian fingerprints** — every crime type has its own time-of-day signature
2. **Block-level memory** — crimes self-reinforce within 7 days (narcotics: 8.7× lift)
3. **Four crime regions** — community areas cluster into four interpretable archetypes that don't perfectly follow administrative geography

## Setup

```bash
npm install
```

Place these two files in `public/data/`:

### 1. `crime-dashboard.json`

Output of `export_dashboard_data.py` (run against your Neo4j instance).

### 2. `community-areas.geojson`

Chicago community area boundaries — download from the City of Chicago portal:

```bash
curl -L -o public/data/community-areas.geojson \
  "https://data.cityofchicago.org/api/geospatial/cauq-8yn6?method=export&format=GeoJSON"
```

The file is ~1.4 MB. The map component reads `area_numbe` (sic — truncated) and `community` from each feature's properties.

## Run locally

```bash
npm run dev
```

Open http://localhost:5173.

## Deploy to GitHub Pages

1. Push to a GitHub repo. Default base path assumes the repo is named `chicago-crime-dashboard`.
2. If your repo has a different name, override at build time:

   ```bash
   VITE_BASE=/your-repo-name/ npm run deploy
   ```

3. In GitHub repo settings → Pages → Source, pick the `gh-pages` branch.

The `npm run deploy` script builds and pushes `dist/` to a `gh-pages` branch via the `gh-pages` package.

## Stack

- Vite + React 18 (plain JS, no TS)
- D3 7 for choropleth, sparklines, heatmap
- Single static JSON bundle (~115 KB) loaded at startup; no backend

## Data pipeline

```
Chicago SODA API
    ├─ ingest_chicago_crime.py     →  crimes.parquet
    ├─ load_chicago_crime.py       →  Neo4j graph
    ├─ compute_ca_profiles.py      →  CA deviation profiles
    ├─ (Cypher: KNN + Louvain)     →  cluster assignments
    └─ export_dashboard_data.py    →  crime-dashboard.json
                                          ↓
                                    React dashboard
```

## Project structure

```
src/
├── App.jsx                    top-level shell, loads data, holds shared state
├── main.jsx                   React entry
├── dashboard.css              all styles
├── lib/
│   └── colors.js              cluster color/label mapping
└── components/
    ├── Header.jsx             title + summary stats
    ├── ClusterMap.jsx         the choropleth (centerpiece)
    ├── SignaturePanel.jsx     over/under deviation bars
    ├── HourlyGrid.jsx         12 small-multiples sparklines
    └── SuccessionHeatmap.jsx  crime-type lift matrix
```
