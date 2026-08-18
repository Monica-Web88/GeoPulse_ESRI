import { useMemo, type CSSProperties } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { CalcitePanel } from "@esri/calcite-components-react";
import { IncidentProperties, SEVERITY_COLORS, CATEGORY_LABELS, Severity, Category } from "../types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

interface Props {
  incidents: IncidentProperties[];
}

const SEVERITY_ORDER: Severity[] = ["Low", "Moderate", "High", "Extreme"];

export default function StatsPanel({ incidents }: Props) {
  const { severityCounts, categoryCounts, totalAcres, avgContained } = useMemo(() => {
    const sevCounts: Record<Severity, number> = { Low: 0, Moderate: 0, High: 0, Extreme: 0 };
    const catCounts: Record<Category, number> = { WF: 0, RX: 0, CX: 0 };
    let acres = 0;
    let containedSum = 0;

    for (const inc of incidents) {
      sevCounts[inc.severity] = (sevCounts[inc.severity] ?? 0) + 1;
      catCounts[inc.category] = (catCounts[inc.category] ?? 0) + 1;
      acres += inc.incidentSizeAcres ?? 0;
      containedSum += inc.percentContained ?? 0;
    }

    return {
      severityCounts: sevCounts,
      categoryCounts: catCounts,
      totalAcres: acres,
      avgContained: incidents.length ? containedSum / incidents.length : 0,
    };
  }, [incidents]);

  const barData = {
    labels: SEVERITY_ORDER,
    datasets: [
      {
        label: "Incidents",
        data: SEVERITY_ORDER.map((s) => severityCounts[s]),
        backgroundColor: SEVERITY_ORDER.map((s) => SEVERITY_COLORS[s]),
        borderRadius: 4,
      },
    ],
  };

  const categoryKeys = Object.keys(categoryCounts) as Category[];
  const doughnutData = {
    labels: categoryKeys.map((c) => CATEGORY_LABELS[c]),
    datasets: [
      {
        data: categoryKeys.map((c) => categoryCounts[c]),
        backgroundColor: ["#3b7dd8", "#2ea87c", "#a35ee0"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <CalcitePanel heading="On-Screen Stats" description="Updates as you pan and zoom the map">
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <StatCard label="Incidents" value={incidents.length.toLocaleString()} />
          <StatCard label="Total Acres" value={Math.round(totalAcres).toLocaleString()} />
          <StatCard label="Avg. Contained" value={`${avgContained.toFixed(0)}%`} />
        </div>

        <div>
          <h4 style={chartTitleStyle}>By Severity</h4>
          <Bar
            data={barData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            }}
            height={160}
          />
        </div>

        <div>
          <h4 style={chartTitleStyle}>By Category</h4>
          <Doughnut
            data={doughnutData}
            options={{ responsive: true, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } }}
            height={180}
          />
        </div>
      </div>
    </CalcitePanel>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "#f4f4f4", borderRadius: 6, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#1f3864" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const chartTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#333",
  margin: "0 0 8px",
};
