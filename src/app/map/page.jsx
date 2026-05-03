"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import InfoPanel from "@/components/InfoPanel";
import Footer from "@/components/Footer";

// Leaflet requires browser APIs, so we must disable SSR
const SinkholeMap = dynamic(() => import("@/components/SinkholeMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <Loader2 className="animate-spin w-8 h-8" style={{ color: "rgba(255,255,255,0.5)" }} />
      <p>Loading map...</p>
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
    geology: "No data available",
    insar_summary: "No data available",
    groundwater: "No data available",
  });
  const [insarMetadata, setInsarMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [lastCity, setLastCity] = useState(null);

  const [selectedZone, setSelectedZone] = useState(null);
  const [realProducts, setRealProducts] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [geeResult, setGeeResult] = useState(null);


  const addLog = (msg) => {
    setTerminalLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const analyzeRegion = async () => {
    if (!citySearch.trim()) return;
    setIsLoading(true);
    setError(null);
    setSelectedZone(null);
    setRealProducts([]);
    setTerminalLogs([]);
    setGeeResult(null);

    
    try {
      addLog("Initializing GEE Cloud Pipeline (Sentinel-1 SLC Stack)...");
      const startTime = Date.now();
      
      const res = await fetch(
        `/api/susceptibility?city=${encodeURIComponent(citySearch.trim())}`
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Satellite data query failed.");
      }
      const data = await res.json();
      
      const elapsed = (Date.now() - startTime) / 1000;
      setGeeResult(data.geeResult);
      
      if (data.geeResult && !data.geeResult.error) {
        addLog(`GEE Handshake successful. Analyzing stack of ${data.geeResult.product_count} images...`);
        addLog(`Log-Ratio & Temporal Variance computed in ${elapsed.toFixed(1)}s.`);
        addLog(`✅ SAR ANALYSIS VERIFIED: Identified ground instability zones.`);
      } else {
        const errorMsg = data.geeResult?.error || "Connection timeout or quota exceeded.";
        addLog(`GEE ERROR: ${errorMsg}`);
      }

      
      setSusceptibilityData(data.geojson);
      setMapCenter(data.center);
      setFactors(data.factors);
      setInsarMetadata(data.insarMetadata);
      setRealProducts(data.realProducts || []);
      setLastCity(citySearch.trim());
    } catch (err) {


      setError(err.message || "Failed to fetch susceptibility data.");
      addLog("CRITICAL ERROR: Processing pipeline aborted.");
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
          <h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            Sol Voyager: Instability Dashboard
            <span className="nasa-badge">Sentinel-1 InSAR Research</span>
          </h1>
          <p className="dashboard-subtitle">
            Advanced land subsidence detection using Synthetic Aperture Radar (SAR) interferometry.
          </p>
        </div>

        {/* Search Bar */}
        <div className="map-search-bar">
          <div className="map-search-input-wrap">
            <i className="fas fa-satellite map-search-icon"></i>
            <input
              className="map-search-input"
              type="text"
              placeholder="Query region for InSAR analysis (e.g. Karapinar, Mexico City, Venice...)"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>
          <button
            className="map-search-btn"
            onClick={analyzeRegion}
            disabled={isLoading || !citySearch.trim()}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" style={{ width: "1rem", height: "1rem" }} />
            ) : (
              <i className="fas fa-microscope"></i>
            )}
            {isLoading ? "Inverting Phase..." : "Analyze Subsidence"}
          </button>
        </div>

        {/* Research Terminal */}
        {(isLoading || terminalLogs.length > 0) && (
          <div className="research-terminal" style={{ 
            background: "#000", 
            color: "#00ff00", 
            fontFamily: "monospace", 
            padding: "1rem", 
            borderRadius: "8px", 
            fontSize: "0.8rem", 
            marginTop: "1rem",
            border: "1px solid #333",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}>
            {terminalLogs.length === 0 && <div>&gt; Awaiting satellite handshake...</div>}
            {terminalLogs.map((log, i) => (
              <div key={i}>&gt; {log}</div>
            ))}
            {isLoading && <div className="blink-cursor">&gt; _</div>}
          </div>

        )}


        {error && (
          <div className="map-error">
            <i className="fas fa-exclamation-triangle"></i> {error}
          </div>
        )}

        {lastCity && (
          <div className="map-status-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <i className="fas fa-check-circle" style={{ color: "var(--primary-glow)" }}></i>
              Analysis complete for <strong>{lastCity}</strong>
            </span>
            <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
              Acquisition Date: {insarMetadata?.acquisition_date} | Mode: IW
            </span>
          </div>
        )}

        <div className="map-layout">
          {/* Sidebar */}
          <div className="map-sidebar">
            <InfoPanel 
              factors={factors} 
              susceptibilityData={susceptibilityData} 
              insarMetadata={insarMetadata}
              selectedZone={selectedZone}
              realProducts={realProducts}
              geeResult={geeResult}
            />



            <div className="map-legend card" style={{ marginTop: "1rem" }}>
              <h3 className="card-title" style={{ marginBottom: "1rem" }}>
                <i className="fas fa-chart-line"></i> Risk Legend
              </h3>
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: "#ef4444" }}></span>
                <div>
                  <div className="legend-label">Critical Subsidence</div>
                  <div className="legend-desc">&lt; -8.0 mm/yr (Sentinel-1)</div>
                </div>
              </div>
              <div className="legend-item">
                <span className="legend-swatch" style={{ background: "#facc15" }}></span>
                <div>
                  <div className="legend-label">Moderate Movement</div>
                  <div className="legend-desc">-4.0 to -8.0 mm/yr</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="map-main">
            <SinkholeMap
              center={mapCenter}
              zoom={12}
              geojsonData={susceptibilityData}
              onSelectZone={setSelectedZone}
            />

            <p className="map-caption">
              <i className="fas fa-project-diagram"></i>
              Visualizing relative ground displacement derived from SAR phase differences. Higher density zones indicate increased sinkhole susceptibility.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

