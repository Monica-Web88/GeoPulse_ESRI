import { CalcitePanel, CalciteLabel, CalciteInput, CalciteSelect, CalciteOption, CalciteButton, CalciteNotice } from "@esri/calcite-components-react";
import { Filters, DEFAULT_FILTERS } from "../types";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  totalIncidents: number;
}

export default function FilterPanel({ filters, onChange, totalIncidents }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <CalcitePanel heading="Filter Incidents" description="Narrows both the map and the chart below">
      <div style={{ padding: "0 16px 16px" }}>
        <CalciteLabel>
          Start date
          <CalciteInput
            type="date"
            value={filters.startDate}
            onCalciteInputInput={(e: any) => update({ startDate: e.target.value })}
          />
        </CalciteLabel>

        <CalciteLabel>
          End date
          <CalciteInput
            type="date"
            value={filters.endDate}
            onCalciteInputInput={(e: any) => update({ endDate: e.target.value })}
          />
        </CalciteLabel>

        <CalciteLabel>
          Category
          <CalciteSelect
            label="Category"
            value={filters.category}
            onCalciteSelectChange={(e: any) => update({ category: e.target.value })}
          >
            <CalciteOption value="">All categories</CalciteOption>
            <CalciteOption value="WF">Wildfire</CalciteOption>
            <CalciteOption value="RX">Prescribed Fire</CalciteOption>
            <CalciteOption value="CX">Complex</CalciteOption>
          </CalciteSelect>
        </CalciteLabel>

        <CalciteLabel>
          Severity
          <CalciteSelect
            label="Severity"
            value={filters.severity}
            onCalciteSelectChange={(e: any) => update({ severity: e.target.value })}
          >
            <CalciteOption value="">All severities</CalciteOption>
            <CalciteOption value="Low">Low (&lt; 10 acres)</CalciteOption>
            <CalciteOption value="Moderate">Moderate (10–100 acres)</CalciteOption>
            <CalciteOption value="High">High (100–1,000 acres)</CalciteOption>
            <CalciteOption value="Extreme">Extreme (1,000+ acres)</CalciteOption>
          </CalciteSelect>
        </CalciteLabel>

        <CalciteButton width="full" appearance="outline" onClick={() => onChange(DEFAULT_FILTERS)} style={{ marginTop: 12 }}>
          Reset filters
        </CalciteButton>

        <CalciteNotice open icon="information" style={{ marginTop: 16 }}>
          <div slot="message">{totalIncidents.toLocaleString()} incidents currently visible on map</div>
        </CalciteNotice>
      </div>
    </CalcitePanel>
  );
}
