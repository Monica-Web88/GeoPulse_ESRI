export type Category = "WF" | "RX" | "CX";
export type Severity = "Low" | "Moderate" | "High" | "Extreme";

export interface IncidentProperties {
  id: number;
  irwinId: string | null;
  incidentName: string;
  category: Category;
  fireDiscoveryDate: string | null;
  incidentSizeAcres: number;
  percentContained: number;
  fireCause: string | null;
  state: string | null;
  severity: Severity;
}

export interface Filters {
  startDate: string; // yyyy-mm-dd, empty string = no filter
  endDate: string;
  category: Category | "";
  severity: Severity | "";
}

export const DEFAULT_FILTERS: Filters = {
  startDate: "",
  endDate: "",
  category: "",
  severity: "",
};

export interface StatsResponse {
  bySeverity: Array<{ severity: Severity; count: number; total_acres: string }>;
  byCategory: Array<{ category: Category; count: number }>;
  totals: {
    total_incidents: number;
    total_acres: string;
    avg_percent_contained: string;
  };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  WF: "Wildfire",
  RX: "Prescribed Fire",
  CX: "Complex",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  Low: "#f5c264",
  Moderate: "#f0972b",
  High: "#e2571c",
  Extreme: "#a3211b",
};
