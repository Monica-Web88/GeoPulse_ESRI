import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import incidentsRouter from "./routes/incidents";
import { pool } from "./db/pool";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use("/api/incidents", incidentsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`GeoPulse API listening on http://localhost:${PORT}`);
});
