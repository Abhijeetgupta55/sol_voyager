"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";


/** Fly to a new center whenever it changes */
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.flyTo(center, zoom || 12, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

function getPolygonStyle(feature) {
  const risk = feature.properties.risk;
  return {
    color: risk === "very_high" ? "#ef4444" : "#facc15",
    fillColor: risk === "very_high" ? "#ef4444" : "#facc15",
    fillOpacity: 0.55,
    weight: 1.5,
  };
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
            const risk = feature.properties.risk;
            const color = risk === "very_high" ? "#ef4444" : (risk === "moderate" ? "#facc15" : "#4ade80");
            return L.circleMarker(latlng, {
              radius: risk === "very_high" ? 8 : 4,
              fillColor: color,
              color: "#fff",
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            });
          }}
          onEachFeature={(feature, layer) => {
            const { risk, bci_db, isi_std } = feature.properties;
            
            layer.on('click', () => {
              if (onSelectZone) onSelectZone(feature.properties);
            });

            layer.bindPopup(
              `<div style="font-family: Inter, sans-serif; color: #1a1a1a;">` +
              `<b style="color: ${risk === 'very_high' ? '#ef4444' : '#b45309'}; text-transform: uppercase;">Heuristic Outlier: ${risk.replace("_", " ")}</b><br/>` +
              `<hr style="margin: 5px 0; border: 0; border-top: 1px solid #eee;"/>` +
              `<b>BCI:</b> ${bci_db} dB<br/>` +
              `<b>ISI:</b> ${isi_std} (Intensity StdDev)<br/>` +
              `<div style="font-size: 0.65rem; margin-top: 5px; opacity: 0.7;">* Uncalibrated Heuristic Analysis</div>` +
              `</div>`
            );
          }}



        />
      )}

    </MapContainer>
  );
}

