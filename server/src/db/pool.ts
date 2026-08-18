import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "geopulse",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  // Idle client errors shouldn't crash the whole API process
  console.error("Unexpected error on idle PostgreSQL client", err);
});
