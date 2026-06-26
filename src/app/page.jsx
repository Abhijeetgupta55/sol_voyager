"use client";

import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import AlertItem from "@/components/AlertItem";
import ZoneItem from "@/components/ZoneItem";
import Footer from "@/components/Footer";
import Link from "next/link";

// NOTE: These stats are illustrative placeholders for UI demonstration.
// A production system would derive these from a persistent database of
// completed GEE analysis jobs, not static constants.
const stats = [
  {
    icon: "fas fa-satellite",
    label: "Queried Regions",
    value: "21",
    change: "Demo data — not live",
    changeIcon: "fas fa-info-circle",
    variant: "success",
  },
  {
    icon: "fas fa-exclamation-circle",
    label: "High-Confidence Clusters",
    value: "—",
    change: "Run /map to generate",
    changeIcon: "fas fa-arrow-right",
    variant: "danger",
  },
  {
    icon: "fas fa-map-marker-alt",
    label: "Dataset Patches",
    value: "21",
    change: "Labels in dataset/labels/",
    changeIcon: "fas fa-database",
    variant: "warning",
  },
  {
    icon: "fas fa-sync-alt",
    label: "GEE API Status",
    value: "Live",
    change: "Sentinel-1 GRD VV",
    changeIcon: "fas fa-check-circle",
    variant: "",
  },
];

// Illustrative alert entries — a real system would populate these from
// a persistent store of anomaly detections with timestamps and coordinates.
const alerts = [
  {
    title: "High-Confidence Backscatter Anomaly",
    severity: "high",
    location: "Karapınar, Turkey (demo run)",
    time: "Example entry",
  },
  {
    title: "Moderate Anomaly Cluster Detected",
    severity: "medium",
    location: "Mexico City, Mexico (demo run)",
    time: "Example entry",
  },
  {
    title: "Anomaly Candidates Identified",
    severity: "medium",
    location: "Venice, Italy (demo run)",
    time: "Example entry",
  },
  {
    title: "SAR Stack Analysis Complete",
    severity: "low",
    location: "Delhi, India (demo run)",
    time: "Example entry",
  },
];

// Illustrative zone entries. Deformation rates shown as "N/A" because this
// system measures backscatter anomalies, not phase-unwrapped displacement.
// Actual rates require SLC InSAR processing (not implemented here).
const zones = [
  {
    name: "Karapınar, Turkey",
    status: "monitoring-status",
    statusLabel: "SCREENED",
    details: "BCI anomaly confidence: heuristic | Deformation rate: N/A (GRD only)",
  },
  {
    name: "Mexico City, Mexico",
    status: "monitoring-status",
    statusLabel: "SCREENED",
    details: "BCI anomaly confidence: heuristic | Deformation rate: N/A (GRD only)",
  },
  {
    name: "Venice, Italy",
    status: "active-status",
    statusLabel: "SCREENED",
    details: "BCI anomaly confidence: heuristic | Deformation rate: N/A (GRD only)",
  },
  {
    name: "Delhi, India",
    status: "active-status",
    statusLabel: "SCREENED",
    details: "BCI anomaly confidence: heuristic | Deformation rate: N/A (GRD only)",
  },
];

export default function DashboardPage() {
  return (
    <>
      <Navbar />

      <div className="container">
        <div className="dashboard-header" style={{ marginBottom: "3rem" }}>
          <h1 className="dashboard-title">
            Urban Ground Instability Monitoring
          </h1>
          <p className="dashboard-subtitle">
            Sentinel-1 SAR backscatter anomaly screening — heuristic outlier detection,
            not phase-deformation measurement. Use /map to run a live analysis.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="content-grid">
          {/* Map Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-globe"></i> Deformation Map
              </h3>
              <Link href="/map" className="view-all">
                Full Screen <i className="fas fa-expand"></i>
              </Link>
            </div>
            <div className="map-container">
              <div className="map-placeholder">
                <div className="map-placeholder-icon">
                  <i className="fas fa-map"></i>
                </div>
                <p>SAR Backscatter Anomaly Map</p>
                <p style={{ fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  <Link href="/map" className="map-cta-link">
                    <i className="fas fa-satellite-dish"></i> Open Sinkhole Susceptibility Mapper →
                  </Link>
                </p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.5rem", opacity: 0.5 }}>
                  Search any city to screen SAR backscatter anomalies (heuristic, uncalibrated)
                </p>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="fas fa-bell"></i> Recent Alerts
              </h3>
              <span className="view-all" style={{ cursor: "default", opacity: 0.5 }}>
                View All <i className="fas fa-arrow-right"></i>
              </span>
            </div>
            <div className="alert-list">
              {alerts.map((a, i) => (
                <AlertItem key={i} {...a} />
              ))}
            </div>
          </div>
        </div>

        {/* Monitoring Zones */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-layer-group"></i> Active Monitoring Zones
            </h3>
            <Link href="/map" className="view-all">
              Analyze on Map <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="zone-list">
            {zones.map((z, i) => (
              <ZoneItem key={i} {...z} />
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
