"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.body.classList.add("light-theme");
      setIsLight(true);
    }
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const navLinks = [
    { href: "/", label: "Dashboard", icon: "fas fa-chart-line" },
    { href: "/map", label: "Map View", icon: "fas fa-map-marked-alt" },
    { href: "/alerts", label: "Alerts", icon: "fas fa-exclamation-triangle" },
    { href: "/analytics", label: "Analytics", icon: "fas fa-chart-bar" },
    { href: "/data-sources", label: "Data Sources", icon: "fas fa-database" },
    { href: "/settings", label: "Settings", icon: "fas fa-cog" },
  ];

  return (
    <>
      <nav>
        <div className="nav-left" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            className={`hamburger${sidebarOpen ? " active" : ""}`}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            role="button"
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
          {/* Quick nav links (visible on desktop) */}
          <div className="nav-links-desktop">
            <Link href="/" className={`nav-link${pathname === "/" ? " nav-link-active" : ""}`}>
              Dashboard
            </Link>
            <Link href="/map" className={`nav-link${pathname === "/map" ? " nav-link-active" : ""}`}>
              Map View
            </Link>
          </div>
          <div className="theme-toggle" onClick={toggleTheme} role="button" aria-label="Toggle theme">
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
        <div className="sidebar-header">
          <i className="fas fa-satellite"></i> Sol Voyager
        </div>
        <div className="sidebar-links">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
            >
              <i className={icon}></i> {label}
              {(href === "/alerts" || href === "/analytics" || href === "/data-sources" || href === "/settings") && (
                <span className="sidebar-coming-soon">Soon</span>
              )}
            </Link>
          ))}
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
