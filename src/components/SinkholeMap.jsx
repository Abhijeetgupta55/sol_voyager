"use client";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function getPolygonStyle(feature) {
  const risk = feature.properties.risk;
  return {
    color: risk === "very_high" ? "#ef4444" : "#facc15",
    fillColor: risk === "very_high" ? "#ef4444" : "#facc15",
    fillOpacity: 0.6,
    weight: 2,
  };
}

export default function SinkholeMap({ center, zoom, geojsonData }) {
  return (
    <MapContainer
      center={center}
      zoom={zoom || 12}
      style={{ height: "500px", width: "100%" }}
      className="rounded-lg shadow-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {geojsonData && (
        <GeoJSON
          data={geojsonData}
          style={getPolygonStyle}
          onEachFeature={(feature, layer) => {
            layer.bindPopup(
              `<b>Risk:</b> ${feature.properties.risk.replace("_", " ").toUpperCase()}`
            );
          }}
        />
      )}
    </MapContainer>
  );
}
