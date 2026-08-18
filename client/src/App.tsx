import { useState, useCallback } from "react";
import { CalciteShell } from "@esri/calcite-components-react";
import Header from "./components/Header";
import FilterPanel from "./components/FilterPanel";
import ArcGISMapView from "./components/MapView";
import StatsPanel from "./components/StatsPanel";
import { Filters, DEFAULT_FILTERS, IncidentProperties } from "./types";

const SIDEBAR_WIDTH = 360; // px — adjust to taste

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visibleIncidents, setVisibleIncidents] = useState<IncidentProperties[]>([]);

  const handleVisibleIncidentsChange = useCallback((incidents: IncidentProperties[]) => {
    setVisibleIncidents(incidents);
  }, []);

  return (
    <CalciteShell style={{ height: "100vh" }}>
      <Header />

      {/* Plain flex row instead of CalciteShellPanel slots — guarantees the map
          gets exactly the remaining width and never gets squeezed. */}
      <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
        {/* Left sidebar: fixed width, scrollable, holds Filter + Stats stacked */}
        <div
          style={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            height: "100%",
            overflowY: "auto",
            borderRight: "1px solid var(--calcite-color-border-3, #ddd)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <FilterPanel filters={filters} onChange={setFilters} totalIncidents={visibleIncidents.length} />
          <StatsPanel incidents={visibleIncidents} />
        </div>

        {/* Map: flex:1 takes 100% of remaining space to the right */}
        <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
          <ArcGISMapView filters={filters} onVisibleIncidentsChange={handleVisibleIncidentsChange} />
        </div>
      </div>
    </CalciteShell>
  );
}
