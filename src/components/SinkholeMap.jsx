"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || 12, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const RISK_COLOR = {
  very_high: "#ef4444",
  moderate: "#facc15",
  low: "#4ade80",
};

const RISK_RADIUS = {
  very_high: 8,
  moderate: 5,
  low: 3,
};

function getPolygonStyle(feature) {
  const color = RISK_COLOR[feature.properties.risk] ?? RISK_COLOR.low;
  return { color, fillColor: color, fillOpacity: 0.55, weight: 1.5 };
}

export default function SinkholeMap({ center, zoom, geojsonData, onSelectZone }) {
  return (
    <MapContainer
      center={center || [37.675, 33.554]}
      zoom={zoom || 12}
      style={{ height: "500px", width: "100%", borderRadius: "12px" }}
      className="shadow-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <MapController center={center} zoom={zoom} />

      {geojsonData && (
        <GeoJSON
          key={JSON.stringify(center)}
          data={geojsonData}
          style={getPolygonStyle}
          pointToLayer={(feature, latlng) => {
            const risk = feature.properties.risk ?? "low";
            return L.circleMarker(latlng, {
              radius: RISK_RADIUS[risk] ?? 3,
              fillColor: RISK_COLOR[risk] ?? RISK_COLOR.low,
              color: "#fff",
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8,
            });
          }}
          onEachFeature={(feature, layer) => {
            const { risk, bci, isi, persistence, confidence } = feature.properties;
            const color = RISK_COLOR[risk] ?? RISK_COLOR.low;
            const label = risk === "very_high"
              ? "HIGH CONFIDENCE"
              : risk === "moderate"
              ? "MODERATE CONFIDENCE"
              : "LOW CONFIDENCE";

            layer.on("click", () => {
              if (onSelectZone) onSelectZone(feature.properties);
            });

            layer.bindPopup(
              `<div style="font-family: Inter, sans-serif; color: #1a1a1a; min-width: 180px;">` +
              `<b style="color: ${color}; text-transform: uppercase;">${label}</b>` +
              `<hr style="margin: 5px 0; border: 0; border-top: 1px solid #eee;"/>` +
              `<b>Confidence:</b> ${confidence}% (heuristic)<br/>` +
              `<b>BCI (log-ratio):</b> ${bci}<br/>` +
              `<b>ISI (temporal stdDev):</b> ${isi}<br/>` +
              `<b>Persistence:</b> ${persistence} acquisition(s)<br/>` +
              `<div style="font-size: 0.62rem; margin-top: 6px; opacity: 0.6; line-height:1.4;">` +
              `Backscatter anomaly — not a deformation measurement.<br/>` +
              `Click panel for metric explanations.</div>` +
              `</div>`
            );
          }}
        />
      )}
    </MapContainer>
  );
}
