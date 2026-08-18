/**
 * Seeds wildfire_incidents from NIFC's public WFIGS "Incident Locations"
 * ArcGIS FeatureServer — the same authoritative source ArcGIS/Esri products
 * and the National Interagency Fire Center's own maps use.
 *
 * Service: WFIGS Wildland Fire Incident Locations (public, no key required)
 * https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0
 *
 * If the live service is unreachable (offline demo, firewalled network, the
 * service is temporarily down), this falls back to a realistic synthetic
 * dataset generator so `npm run db:seed` always leaves you with a working
 * demo — see generateSyntheticIncidents() below.
 */
import fetch from "node-fetch";
import { pool } from "./pool";

const WFIGS_QUERY_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query" +
  "?where=1%3D1" +
  "&outFields=IncidentName,FireDiscoveryDateTime,IncidentSize,PercentContained,FireCause,POOState,IrwinID,IncidentTypeCategory" +
  "&geometryType=esriGeometryEnvelope" +
  "&outSR=4326" +
  "&f=geojson" +
  "&resultRecordCount=2000";

interface WfigsFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: {
    IncidentName?: string;
    FireDiscoveryDateTime?: number | null; // epoch millis
    IncidentSize?: number | null;
    PercentContained?: number | null;
    FireCause?: string | null;
    POOState?: string | null;
    IrwinID?: string | null;
    IncidentTypeCategory?: string | null; // WF / RX / CX
  };
}

interface WfigsResponse {
  features: WfigsFeature[];
}

function deriveSeverity(acres: number): "Low" | "Moderate" | "High" | "Extreme" {
  if (acres < 10) return "Low";
  if (acres < 100) return "Moderate";
  if (acres < 1000) return "High";
  return "Extreme";
}

async function fetchLiveIncidents(): Promise<
  Array<{
    irwinId: string | null;
    incidentName: string;
    category: string;
    fireDiscoveryDate: string | null;
    incidentSizeAcres: number;
    percentContained: number;
    fireCause: string | null;
    state: string | null;
    latitude: number;
    longitude: number;
    severity: string;
  }>
> {
  console.log("Fetching live wildfire data from NIFC WFIGS...");
  const res = await fetch(WFIGS_QUERY_URL, { timeout: 20000 } as any);
  if (!res.ok) {
    throw new Error(`WFIGS request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as WfigsResponse;

  const rows = data.features
    .filter((f) => f.geometry && f.geometry.type === "Point")
    .map((f) => {
      const acres = f.properties.IncidentSize ?? 0;
      return {
        irwinId: f.properties.IrwinID ?? null,
        incidentName: f.properties.IncidentName ?? "Unnamed Incident",
        category: f.properties.IncidentTypeCategory ?? "WF",
        fireDiscoveryDate: f.properties.FireDiscoveryDateTime
          ? new Date(f.properties.FireDiscoveryDateTime).toISOString().slice(0, 10)
          : null,
        incidentSizeAcres: acres,
        percentContained: f.properties.PercentContained ?? 0,
        fireCause: f.properties.FireCause ?? null,
        state: f.properties.POOState ?? null,
        longitude: f.geometry!.coordinates[0],
        latitude: f.geometry!.coordinates[1],
        severity: deriveSeverity(acres),
      };
    });

  if (rows.length === 0) {
    throw new Error("WFIGS returned zero features — falling back to synthetic data.");
  }
  return rows;
}

/**
 * Realistic offline fallback. Coordinates are jittered around real fire-prone
 * regions (California, Pacific NW, Southwest, Rockies, Southeast) so the map
 * still looks and behaves like the live dataset for local development.
 */
function generateSyntheticIncidents(count = 500) {
  const regions = [
    { state: "CA", lat: 37.5, lng: -119.5, spread: 3.5 },
    { state: "OR", lat: 43.8, lng: -120.5, spread: 2.5 },
    { state: "WA", lat: 47.4, lng: -120.5, spread: 2 },
    { state: "AZ", lat: 34.2, lng: -111.6, spread: 2.5 },
    { state: "NM", lat: 34.5, lng: -106.1, spread: 2.5 },
    { state: "CO", lat: 39.0, lng: -105.5, spread: 2.5 },
    { state: "ID", lat: 44.5, lng: -114.5, spread: 2.5 },
    { state: "MT", lat: 47.0, lng: -110.0, spread: 3 },
    { state: "TX", lat: 31.5, lng: -99.5, spread: 3.5 },
    { state: "FL", lat: 28.5, lng: -81.5, spread: 2 },
  ];
  const categories = ["WF", "RX", "CX"];
  const causes = ["Lightning", "Human", "Undetermined", "Equipment", "Unknown"];
  const namePrefixes = [
    "Ridge", "Canyon", "Pine", "Bear", "Eagle", "Cedar", "Willow", "Sage",
    "Granite", "River", "Mesa", "Hollow", "Timber", "Copper", "Silver",
  ];
  const nameSuffixes = ["Fire", "Complex", "Creek Fire", "Draw Fire", "Peak Fire"];

  const rows = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const lat = region.lat + (Math.random() - 0.5) * region.spread;
    const lng = region.lng + (Math.random() - 0.5) * region.spread;
    // Long-tail acreage distribution: most fires small, a few huge — matches reality.
    const acres = Math.round(Math.exp(Math.random() * 9) * 10) / 10;
    const daysAgo = Math.floor(Math.random() * 180);
    const discoveryDate = new Date(now - daysAgo * 86400000).toISOString().slice(0, 10);
    const name =
      namePrefixes[Math.floor(Math.random() * namePrefixes.length)] +
      " " +
      nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];

    rows.push({
      irwinId: `SYNTH-${i}-${Math.random().toString(36).slice(2, 8)}`,
      incidentName: name,
      category: categories[Math.floor(Math.random() * categories.length)],
      fireDiscoveryDate: discoveryDate,
      incidentSizeAcres: acres,
      percentContained: Math.round(Math.random() * 100),
      fireCause: causes[Math.floor(Math.random() * causes.length)],
      state: region.state,
      latitude: lat,
      longitude: lng,
      severity: deriveSeverity(acres),
    });
  }
  return rows;
}

async function seed() {
  let rows;
  try {
    rows = await fetchLiveIncidents();
    console.log(`✔ Pulled ${rows.length} live incidents from NIFC WFIGS.`);
  } catch (err) {
    console.warn("⚠ Live NIFC fetch failed, using synthetic fallback dataset instead.");
    console.warn(`  Reason: ${(err as Error).message}`);
    rows = generateSyntheticIncidents(500);
    console.log(`✔ Generated ${rows.length} synthetic incidents.`);
  }

  console.log("Clearing existing rows...");
  await pool.query("TRUNCATE TABLE wildfire_incidents RESTART IDENTITY");

  console.log("Inserting rows...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const insertSql = `
      INSERT INTO wildfire_incidents
        (irwin_id, incident_name, category, fire_discovery_date, incident_size_acres,
         percent_contained, fire_cause, state, latitude, longitude, severity)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (irwin_id) DO NOTHING
    `;
    for (const r of rows) {
      await client.query(insertSql, [
        r.irwinId,
        r.incidentName,
        r.category,
        r.fireDiscoveryDate,
        r.incidentSizeAcres,
        r.percentContained,
        r.fireCause,
        r.state,
        r.latitude,
        r.longitude,
        r.severity,
      ]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log("✔ Seed complete.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
