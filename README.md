# GeoPulse — Interactive Wildfire Geospatial Dashboard

A full-stack, map-first dashboard for exploring US wildfire incident data:
filter by date/category/severity, watch the map and the on-screen stats
update live as you pan and zoom, and click any incident for full detail.

**ArcGIS Maps SDK for JavaScript**,
the **Calcite Design System**, **React + TypeScript**, REST API design, and
**PostgreSQL**.

![GeoPulse screenshot placeholder](docs/screenshot.png)

## Live demo

`[ADD YOUR DEPLOYED URL HERE ONCE HOSTED]`

## Architecture

```
┌─────────────────────┐        GeoJSON over REST        ┌──────────────────────┐
│  React + TypeScript │  ───────────────────────────▶   │  Express REST API    │
│  ArcGIS Maps SDK     │                                  │  (Node + TypeScript) │
│  Calcite Components   │  ◀───────────────────────────   │                      │
│  Chart.js             │        aggregate stats JSON      └──────────┬───────────┘
└─────────────────────┘                                              │ SQL
                                                                       ▼
                                                            ┌──────────────────┐
                                                            │   PostgreSQL      │
                                                            │ wildfire_incidents │
                                                            └──────────────────┘
```

- **Client** (`/client`) — Vite + React + TypeScript. `MapView.tsx` owns the
  ArcGIS `MapView`/`GeoJSONLayer` lifecycle; `FilterPanel.tsx` is built
  entirely from Calcite components (`calcite-panel`, `calcite-select`,
  `calcite-input`); `StatsPanel.tsx` renders Chart.js bar/doughnut charts.
- **Server** (`/server`) — Express + `pg`. Two endpoints share one
  filter-building function so the map and the chart panel can never show data
  that's out of sync with each other.
- **Database** — a single, indexed `wildfire_incidents` table in PostgreSQL,
  seeded from NIFC's real public wildfire dataset (see below).

## The data-sync architecture 

The chart panel doesn't just mirror the filter sidebar — it reflects **exactly
what's currently drawn inside the map's viewport**, including after a pan or
zoom with no filter change. That's done with the ArcGIS SDK's own reactive
API, not a manual event listener:

```ts
reactiveUtils.watch(
  () => view.stationary,
  async (stationary) => {
    if (!stationary) return;
    const query = layerView.createQuery();
    query.geometry = view.extent;
    query.spatialRelationship = "intersects";
    const result = await layerView.queryFeatures(query);
    onVisibleIncidentsChange(result.features.map(f => f.attributes));
  }
);
```

Every pan/zoom fires a `queryFeatures` call scoped to the live map extent, and
the React state update flows straight into `StatsPanel`'s `useMemo`
aggregation — one source of truth, two views of it.

## Data source

Seeded from the **National Interagency Fire Center's WFIGS "Incident
Locations"** service — the same authoritative, public dataset Esri's own NIFC
partnership maps are built on:

```
https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0
```

`npm run db:seed` pulls live incidents from that service. If it's unreachable
(offline, firewalled network, service downtime), the seed script automatically
falls back to a realistic synthetic dataset generator so the app is always
demoable — see `server/src/db/seed.ts`.

`severity` (Low / Moderate / High / Extreme) is derived server-side from
incident acreage at seed time — a deliberate design choice so the severity
filter is fast (indexed column) rather than computed per-request.

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker, see below)

### 1. Database

```bash
# Option A — Docker (fastest)
docker compose up -d

# Option B — local Postgres: create a database named `geopulse` yourself
```

### 2. Server

```bash
cd server
cp .env.example .env      # defaults match docker-compose.yml
npm install
npm run db:migrate        # creates the wildfire_incidents table
npm run db:seed           # pulls live NIFC data (or synthetic fallback)
npm run dev                # http://localhost:4000
```

### 3. Client

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the
Express server, so no CORS config is needed locally.

### Optional: your own basemap

The map defaults to Esri's `topo-vector` basemap, which works without an API
key. To use a custom Esri basemap style, grab a free key from the [ArcGIS
Location Platform](https://location.arcgis.com/sign-up/), then set it in
`client/src/components/MapView.tsx`:

```ts
import esriConfig from "@arcgis/core/config";
esriConfig.apiKey = "YOUR_KEY_HERE";
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/health` | DB connectivity check |
| `GET /api/incidents` | GeoJSON `FeatureCollection`. Filters: `startDate`, `endDate`, `category`, `severity` |
| `GET /api/incidents/stats` | Aggregate counts by severity/category + totals. Same filters, plus `bbox` |


## Tech stack

**Client:** React 18, TypeScript, Vite, ArcGIS Maps SDK for JavaScript,
Calcite Design System (`@esri/calcite-components-react`), Chart.js
**Server:** Node.js, Express, TypeScript, `pg`
**Database:** PostgreSQL
