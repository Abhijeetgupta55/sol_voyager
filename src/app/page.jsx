"use client";

import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import AlertItem from "@/components/AlertItem";
import ZoneItem from "@/components/ZoneItem";
import Footer from "@/components/Footer";
import Link from "next/link";

const stats = [
  {
    icon: "fas fa-satellite",
    label: "Monitoring Zones",
    value: "24",
    change: "3 new zones this month",
    changeIcon: "fas fa-arrow-up",
    variant: "success",
  },
  {
    icon: "fas fa-exclamation-circle",
    label: "Active Alerts",
    value: "7",
    change: "2 in last 24h",
    changeIcon: "fas fa-arrow-up",
    variant: "danger",
  },
  {
    icon: "fas fa-map-marker-alt",
    label: "High Risk Areas",
    value: "12",
    change: "1 resolved this week",
    changeIcon: "fas fa-arrow-down",
    variant: "warning",
  },
  {
    icon: "fas fa-sync-alt",
    label: "Data Uptime",
    value: "98.5%",
    change: "System healthy",
    changeIcon: "fas fa-check-circle",
    variant: "",
  },
];

const alerts = [
  {
    title: "Critical Subsidence Detected",
    severity: "high",
    location: "Downtown District, Zone A-12",
    time: "2 hours ago",
  },
  {
    title: "Ground Deformation Increase",
    severity: "medium",
    location: "Industrial Area, Zone B-07",
    time: "5 hours ago",
  },
  {
    title: "Potential Sinkhole Formation",
    severity: "medium",
    location: "Residential Area, Zone C-15",
    time: "8 hours ago",
  },
  {
    title: "Monitoring Update Available",
    severity: "low",
    location: "Park District, Zone D-03",
    time: "12 hours ago",
  },
];

const zones = [
  {
    name: "Downtown District — Zone A-12",
    status: "monitoring-status",
    statusLabel: "MONITORING",
    details: "Deformation rate: −8.5 mm/yr  |  Last update: 2 hours ago",
  },
  {
    name: "Industrial Area — Zone B-07",
    status: "monitoring-status",
    statusLabel: "MONITORING",
    details: "Deformation rate: −5.2 mm/yr  |  Last update: 5 hours ago",
  },
  {
    name: "Residential Area — Zone C-15",
    status: "active-status",
    statusLabel: "STABLE",
    details: "Deformation rate: −1.8 mm/yr  |  Last update: 8 hours ago",
  },
  {
    name: "Park District — Zone D-03",
    status: "active-status",
    statusLabel: "STABLE",
    details: "Deformation rate: −0.5 mm/yr  |  Last update: 12 hours ago",
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
            Real-time early warning system powered by Sentinel-1 InSAR analysis
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
                <p>Interactive InSAR Deformation Map</p>
                <p style={{ fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  <Link href="/map" className="map-cta-link">
                    <i className="fas fa-satellite-dish"></i> Open Sinkhole Susceptibility Mapper →
                  </Link>
                </p>
                <p style={{ fontSize: "0.75rem", marginTop: "0.5rem", opacity: 0.5 }}>
                  Search any city to visualize risk zones with live InSAR data
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
