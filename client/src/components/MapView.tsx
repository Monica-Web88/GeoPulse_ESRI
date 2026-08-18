import { useEffect, useRef } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import Extent from "@arcgis/core/geometry/Extent";
import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import { Filters, IncidentProperties, SEVERITY_COLORS } from "../types";
import { buildIncidentsGeoJsonUrl } from "../api/incidents";

interface Props {
  filters: Filters;
  /** Called whenever the visible map extent settles, with the incidents currently on screen. */
  onVisibleIncidentsChange: (incidents: IncidentProperties[], extent: Extent | null) => void;
}

const renderer = new UniqueValueRenderer({
  field: "severity",
  defaultSymbol: new SimpleMarkerSymbol({ color: "#999999", size: 7, outline: { color: "white", width: 0.5 } }),
  uniqueValueInfos: (Object.keys(SEVERITY_COLORS) as Array<keyof typeof SEVERITY_COLORS>).map((severity) => ({
    value: severity,
    symbol: new SimpleMarkerSymbol({
      color: SEVERITY_COLORS[severity],
      size: severity === "Extreme" ? 12 : severity === "High" ? 10 : severity === "Moderate" ? 8 : 6,
      outline: { color: "white", width: 0.75 },
    }),
    label: severity,
  })),
});

const popupTemplate = {
  title: "{incidentName}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "category", label: "Category" },
        { fieldName: "severity", label: "Severity" },
        { fieldName: "incidentSizeAcres", label: "Size (acres)", format: { digitSeparator: true, places: 1 } },
        { fieldName: "percentContained", label: "% Contained" },
        { fieldName: "fireCause", label: "Cause" },
        { fieldName: "state", label: "State" },
        { fieldName: "fireDiscoveryDate", label: "Discovered" },
      ],
    },
  ],
};

export default function ArcGISMapView({ filters, onVisibleIncidentsChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<MapView | null>(null);
  const layerRef = useRef<GeoJSONLayer | null>(null);

  // Initialize the map + view once.
  useEffect(() => {
    if (!containerRef.current) return;

    const layer = new GeoJSONLayer({
      url: buildIncidentsGeoJsonUrl(filters),
      title: "Wildfire Incidents",
      renderer,
      popupTemplate,
      outFields: ["*"],
    });
    layerRef.current = layer;

    const map = new Map({
      basemap: "topo-vector", // switch to a custom basemap style if you have an ArcGIS Location Platform API key
      layers: [layer],
    });

    const view = new MapView({
      container: containerRef.current,
      map,
      center: [-105, 40], // continental US
      zoom: 4,
      popup: { dockEnabled: false },
    });
    viewRef.current = view;

    // Whenever the map stops moving, query the layer view for exactly what's
    // on screen and hand it up to the chart panel — this is what keeps the
    // chart panel synced to "whatever's currently visible on the map."
    let removeWatch: __esri.WatchHandle | undefined;
    view.when(async () => {
      const layerView = await view.whenLayerView(layer);
      removeWatch = reactiveUtils.watch(
        () => view.stationary,
        async (stationary) => {
          if (!stationary) return;
          const query = layerView.createQuery();
          query.geometry = view.extent;
          query.spatialRelationship = "intersects";
          query.outFields = ["*"];
          try {
            const result = await layerView.queryFeatures(query);
            const incidents = result.features.map((f) => f.attributes as IncidentProperties);
            onVisibleIncidentsChange(incidents, view.extent);
          } catch (err) {
            console.error("Extent query failed:", err);
          }
        },
        { initial: true }
      );
    });

    return () => {
      removeWatch?.remove();
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When filters change, swap the layer's source URL rather than tearing
  // down the whole map — cheaper and avoids a visible flash/re-center.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.url = buildIncidentsGeoJsonUrl(filters);
    layer.refresh();
  }, [filters]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
