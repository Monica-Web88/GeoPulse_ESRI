import { Router, Request, Response } from "express";
import { pool } from "../db/pool";

const router = Router();

const ALLOWED_CATEGORIES = new Set(["WF", "RX", "CX"]);
const ALLOWED_SEVERITIES = new Set(["Low", "Moderate", "High", "Extreme"]);

interface IncidentFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  severity?: string;
  minLng?: number;
  minLat?: number;
  maxLng?: number;
  maxLat?: number;
}

/**
 * Builds a parameterized WHERE clause from query filters shared by both
 * /api/incidents and /api/incidents/stats, so the map and the chart panel
 * are always looking at the exact same slice of data.
 */
function buildWhereClause(q: Request["query"]): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  const startDate = q.startDate as string | undefined;
  const endDate = q.endDate as string | undefined;
  const category = q.category as string | undefined;
  const severity = q.severity as string | undefined;
  const bbox = q.bbox as string | undefined; // "minLng,minLat,maxLng,maxLat"

  if (startDate) {
    params.push(startDate);
    clauses.push(`fire_discovery_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    clauses.push(`fire_discovery_date <= $${params.length}`);
  }
  if (category && ALLOWED_CATEGORIES.has(category)) {
    params.push(category);
    clauses.push(`category = $${params.length}`);
  }
  if (severity && ALLOWED_SEVERITIES.has(severity)) {
    params.push(severity);
    clauses.push(`severity = $${params.length}`);
  }
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      params.push(minLng, minLat, maxLng, maxLat);
      clauses.push(
        `longitude BETWEEN $${params.length - 3} AND $${params.length - 2} ` +
          `AND latitude BETWEEN $${params.length - 1} AND $${params.length}`
      );
    }
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

/**
 * GET /api/incidents
 * Returns a GeoJSON FeatureCollection — consumed directly by an ArcGIS
 * GeoJSONLayer on the client, so the map can render it with zero
 * client-side transformation.
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { where, params } = buildWhereClause(req.query);
    const sql = `
      SELECT id, irwin_id, incident_name, category, fire_discovery_date,
             incident_size_acres, percent_contained, fire_cause, state,
             latitude, longitude, severity
      FROM wildfire_incidents
      ${where}
      ORDER BY fire_discovery_date DESC
      LIMIT 5000
    `;
    const { rows } = await pool.query(sql, params);

    const featureCollection = {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
        properties: {
          id: r.id,
          irwinId: r.irwin_id,
          incidentName: r.incident_name,
          category: r.category,
          fireDiscoveryDate: r.fire_discovery_date,
          incidentSizeAcres: Number(r.incident_size_acres),
          percentContained: Number(r.percent_contained),
          fireCause: r.fire_cause,
          state: r.state,
          severity: r.severity,
        },
      })),
    };

    res.json(featureCollection);
  } catch (err) {
    console.error("GET /api/incidents failed:", err);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

/**
 * GET /api/incidents/stats
 * Aggregate counts/acreage for the chart panel — same filters as the map,
 * so "what's on screen" and "what's in the chart" never drift apart.
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { where, params } = buildWhereClause(req.query);

    const bySeverityQuery = `
      SELECT severity, COUNT(*)::int AS count, COALESCE(SUM(incident_size_acres), 0) AS total_acres
      FROM wildfire_incidents
      ${where}
      GROUP BY severity
    `;
    const byCategoryQuery = `
      SELECT category, COUNT(*)::int AS count
      FROM wildfire_incidents
      ${where}
      GROUP BY category
    `;
    const totalsQuery = `
      SELECT
        COUNT(*)::int AS total_incidents,
        COALESCE(SUM(incident_size_acres), 0) AS total_acres,
        COALESCE(AVG(percent_contained), 0) AS avg_percent_contained
      FROM wildfire_incidents
      ${where}
    `;

    const [bySeverity, byCategory, totals] = await Promise.all([
      pool.query(bySeverityQuery, params),
      pool.query(byCategoryQuery, params),
      pool.query(totalsQuery, params),
    ]);

    res.json({
      bySeverity: bySeverity.rows,
      byCategory: byCategory.rows,
      totals: totals.rows[0],
    });
  } catch (err) {
    console.error("GET /api/incidents/stats failed:", err);
    res.status(500).json({ error: "Failed to fetch incident stats" });
  }
});

export default router;
