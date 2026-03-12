import React, { useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { Search, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [37.675, 33.554]; // Karapınar, Turkey

const InfoPanel = ({ factors }) => (
  <div className="bg-gray-800 text-gray-100 p-4 rounded-lg shadow-lg w-72">
    <h2 className="text-lg font-semibold mb-2">Key Factors</h2>
    <ul className="space-y-2">
      <li>
        <span className="font-bold">Geology:</span> {factors.geology}
      </li>
      <li>
        <span className="font-bold">Deformation:</span> {factors.deformation}
      </li>
      <li>
        <span className="font-bold">Groundwater:</span> {factors.groundwater}
      </li>
    </ul>
  </div>
);

function getPolygonStyle(feature) {
  const risk = feature.properties.risk;
  return {
    color: risk === "very_high" ? "#ef4444" : "#facc15",
    fillColor: risk === "very_high" ? "#ef4444" : "#facc15",
    fillOpacity: 0.6,
    weight: 2,
  };
}

export default function App() {
  const [citySearch, setCitySearch] = useState("");
  const [susceptibilityData, setSusceptibilityData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [factors, setFactors] = useState({
    geology: "Karstic Limestone - Susceptible",
    deformation: "25 mm/year Subsidence - HIGH RISK",
    groundwater: "Rapid Decline - HIGH RISK",
  });

  const analyzeRegion = async () => {
    if (!citySearch) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/susceptibility?city=${encodeURIComponent(citySearch)}`
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setSusceptibilityData(data.geojson);
      setMapCenter(data.center);
      setFactors(data.factors);
    } catch (err) {
      alert("Failed to fetch susceptibility data.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <span>CityWatch: Sinkhole Mapper</span>
          <span className="bg-blue-600 text-xs px-2 py-1 rounded ml-2 font-semibold">
            NASA Space Apps Challenge
          </span>
        </h1>
        <p className="text-gray-400 mt-2">
          Visualize sinkhole risk using simulated InSAR deformation data
        </p>
      </header>
      <div className="flex gap-8 w-full max-w-6xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              className="bg-gray-800 text-gray-100 px-4 py-2 rounded-l-lg outline-none w-64"
              type="text"
              placeholder="Enter city or area..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              disabled={isLoading}
            />
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center gap-1 font-semibold"
              onClick={analyzeRegion}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4" />}
              Analyze Region
            </button>
          </div>
          <InfoPanel factors={factors} />
        </div>
        <div className="flex-1">
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: "500px", width: "100%" }}
            className="rounded-lg shadow-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {susceptibilityData && (
              <GeoJSON
                data={susceptibilityData}
                style={getPolygonStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(
                    `<b>Risk:</b> ${feature.properties.risk.replace("_", " ").toUpperCase()}`
                  );
                }}
              />
            )}
          </MapContainer>
          <div className="mt-2 text-gray-400 text-xs">
            <span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span> High Susceptibility
            <span className="inline-block w-3 h-3 bg-yellow-400 rounded mx-2"></span> Moderate Susceptibility
          </div>
        </div>
      </div>
      <footer className="mt-8 text-gray-500 text-xs">
        &copy; 2025 CityWatch Hackathon Demo
      </footer>
    </div>
  );
}