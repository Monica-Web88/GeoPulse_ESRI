import React from "react";
import ReactDOM from "react-dom/client";
import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import App from "./App";
import "./index.css";

// Registers all <calcite-*> web components used throughout the app.
// Assets are loaded from the CDN path so we don't have to vendor Calcite's
// icon/asset bundle ourselves.
defineCustomElements(window, {
  resourcesUrl: "https://js.arcgis.com/calcite-components/2.13.2/assets",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
