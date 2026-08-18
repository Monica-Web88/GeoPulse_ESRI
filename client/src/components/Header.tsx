import { CalciteNavigation, CalciteNavigationLogo } from "@esri/calcite-components-react";

export default function Header() {
  return (
    <CalciteNavigation slot="header">
      <CalciteNavigationLogo
        slot="logo"
        heading="Monica's GeoPulse"
        description="US Wildfire Incident Dashboard"
        thumbnail=""
      />
    </CalciteNavigation>
  );
}
