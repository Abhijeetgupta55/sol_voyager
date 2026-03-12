"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Search, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import InfoPanel from "@/components/InfoPanel";
import Footer from "@/components/Footer";

// Leaflet requires browser APIs, so we must disable SSR
const SinkholeMap = dynamic(() => import("@/components/SinkholeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] bg-gray-800 rounded-lg">
      <Loader2 className="animate-spin w-8 h-8 text-gray-400" />
    </div>
  ),
});

const DEFAULT_CENTER = [37.675, 33.554]; // Karapınar, Turkey

export default function MapPage() {
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
        `/api/susceptibility?city=${encodeURIComponent(citySearch)}`
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") analyzeRegion();
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
          <h1 className="dashboard-title flex items-center gap-3">
            CityWatch: Sinkhole Mapper
            <span className="bg-blue-600 text-xs px-2 py-1 rounded font-semibold text-white">
              NASA Space Apps Challenge
            </span>
          </h1>
          <p className="dashboard-subtitle">
            Visualize sinkhole risk using simulated InSAR deformation data
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full">
          {/* Sidebar Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                className="bg-gray-800 text-gray-100 px-4 py-2 rounded-l-lg outline-none w-64 border border-gray-700 focus:border-blue-500 transition-colors"
                type="text"
                placeholder="Enter city or area..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg flex items-center gap-1 font-semibold disabled:opacity-50 transition-colors"
                onClick={analyzeRegion}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Analyze Region
              </button>
            </div>
            <InfoPanel factors={factors} />
          </div>

          {/* Map */}
          <div className="flex-1">
            <SinkholeMap
              center={mapCenter}
              zoom={12}
              geojsonData={susceptibilityData}
            />
            <div className="mt-2 text-gray-400 text-xs">
              <span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span>{" "}
              High Susceptibility
              <span className="inline-block w-3 h-3 bg-yellow-400 rounded mx-2"></span>{" "}
              Moderate Susceptibility
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
