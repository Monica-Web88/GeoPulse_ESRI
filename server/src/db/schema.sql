-- GeoPulse schema
-- One table is intentional for this project's scope: a single, well-indexed
-- fact table is the right call for a read-heavy, filter-heavy dashboard API.
-- (In a larger system this would split into incidents + lookup tables for
-- category/severity — noted in the README as a "with more time" item.)

CREATE TABLE IF NOT EXISTS wildfire_incidents (
  id                    SERIAL PRIMARY KEY,
  irwin_id              TEXT UNIQUE,                 -- source system's stable identifier (IRWIN)
  incident_name         TEXT NOT NULL,
  category              TEXT NOT NULL,                -- WF = Wildfire, RX = Prescribed, CX = Complex
  fire_discovery_date   DATE,
  incident_size_acres   NUMERIC(12, 2) DEFAULT 0,
  percent_contained     NUMERIC(5, 2) DEFAULT 0,
  fire_cause            TEXT,
  state                 TEXT,
  latitude              DOUBLE PRECISION NOT NULL,
  longitude             DOUBLE PRECISION NOT NULL,
  severity              TEXT NOT NULL,                 -- Low / Moderate / High / Extreme — derived from acreage
  source                TEXT DEFAULT 'NIFC WFIGS',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Filter sidebar queries by date range, category, and severity, and the map
-- queries by bounding box — index all four access patterns.
CREATE INDEX IF NOT EXISTS idx_incidents_discovery_date ON wildfire_incidents (fire_discovery_date);
CREATE INDEX IF NOT EXISTS idx_incidents_category        ON wildfire_incidents (category);
CREATE INDEX IF NOT EXISTS idx_incidents_severity         ON wildfire_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lng           ON wildfire_incidents (latitude, longitude);
