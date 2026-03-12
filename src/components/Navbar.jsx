"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light-theme");
      setIsLight(true);
    }
  }, []);

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.body.classList.add("light-theme");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      localStorage.setItem("theme", "dark");
    }
  }

  return (
    <>
      <nav>
        <div className="nav-left" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            className={`hamburger${sidebarOpen ? " active" : ""}`}
            onClick={toggleSidebar}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
          <Link href="/" className="nav-logo">
            <i className="fas fa-satellite"></i> Sol Voyager
          </Link>
        </div>
        <div className="nav-right" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div className="theme-toggle" onClick={toggleTheme}>
            <i className={isLight ? "fas fa-moon" : "fas fa-sun"}></i>
          </div>
          <div className="status-indicator">
            <span className="status-dot"></span>
            System Active
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? " active" : ""}`}>
        <div className="sidebar-links">
          <Link href="/" className="active">
            <i className="fas fa-chart-line"></i> Dashboard
          </Link>
          <Link href="/map">
            <i className="fas fa-map-marked-alt"></i> Map View
          </Link>
          <Link href="#">
            <i className="fas fa-exclamation-triangle"></i> Alerts
          </Link>
          <Link href="#">
            <i className="fas fa-chart-bar"></i> Analytics
          </Link>
          <Link href="#">
            <i className="fas fa-database"></i> Data Sources
          </Link>
          <Link href="#">
            <i className="fas fa-cog"></i> Settings
          </Link>
        </div>
      </div>

      {/* Overlay */}
      <div
        className={`overlay${sidebarOpen ? " active" : ""}`}
        onClick={toggleSidebar}
      ></div>
    </>
  );
}
