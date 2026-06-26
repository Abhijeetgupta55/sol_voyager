import { countByRisk } from "@/lib/scoring";

const METRIC_DOCS = {
  bci: {
    label: "BCI (Backscatter Change Intensity)",
    unit: "log-ratio (dimensionless)",
    description:
      "Log-ratio of latest VV intensity vs. multi-image median baseline. " +
      "Positive = brighter than baseline (rougher/wetter); " +
      "negative = darker (smoother/drier). NOT a phase-deformation measurement.",
    thresholds: [
      { range: "|BCI| > 1.5", meaning: "Strong surface change — Path B trigger" },
      { range: "|BCI| > 1.0", meaning: "Moderate change — Path A trigger (with ISI)" },
    ],
  },
  isi: {
    label: "ISI (Intensity Stability Index)",
    unit: "temporal std-dev (VV, linear scale)",
    description:
      "Standard deviation of VV backscatter across the 12-image stack. " +
      "High ISI means the surface scattering varies a lot over time — " +
      "could indicate soil moisture cycles, construction, or instability.",
    thresholds: [
      { range: "ISI > 1.0", meaning: "Elevated instability — Path A trigger" },
    ],
  },
  persistence: {
    label: "Persistence",
    unit: "count (out of stack size)",
    description:
      "Number of acquisitions in which the log-ratio anomaly recurred " +
      "(threshold: |log-ratio| > 1.2). Higher persistence suggests a sustained " +
      "change rather than a single-pass artefact.",
    thresholds: [
      { range: "≥ 1", meaning: "Required to pass the speckle filter" },
    ],
  },
  confidence: {
    label: "Composite Confidence",
    unit: "0–100 (heuristic, uncalibrated)",
    description:
      "Weighted average: 40 % magnitude (BCI), 30 % stability (ISI), " +
      "30 % persistence. Normalisation denominators are arbitrary — this is NOT " +
      "a calibrated probability. Treat as a relative ranking within a single query.",
    thresholds: [
      { range: "> 65", meaning: "Classified as high-confidence anomaly (red)" },
      { range: "35 – 65", meaning: "Classified as moderate-confidence anomaly (yellow)" },
      { range: "≤ 35", meaning: "Classified as low-confidence anomaly (green)" },
    ],
  },
};

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
      <span style={{ fontSize: "0.72rem", opacity: 0.75 }}>{label}</span>
      <span style={{ fontWeight: "bold", color: color ?? "#4ade80", fontSize: "0.9rem" }}>{value}</span>
    </div>
  );
}

function MetricCard({ metricKey, value }) {
  const doc = METRIC_DOCS[metricKey];
  if (!doc) return null;
  return (
    <div
      style={{
        background: "rgba(0,30,0,0.35)",
        border: "1px solid rgba(74,222,128,0.15)",
        borderRadius: "6px",
        padding: "0.65rem",
        marginBottom: "0.5rem",
      }}
    >
      <div style={{ fontSize: "0.72rem", fontWeight: "bold", color: "#4ade80", marginBottom: "0.2rem" }}>
        {doc.label}
      </div>
      <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", marginBottom: "0.35rem" }}>
        {value}
        <span style={{ fontSize: "0.65rem", opacity: 0.6, marginLeft: "0.4rem" }}>{doc.unit}</span>
      </div>
      <div style={{ fontSize: "0.67rem", opacity: 0.7, lineHeight: 1.45, marginBottom: "0.4rem" }}>
        {doc.description}
      </div>
      <div style={{ fontSize: "0.65rem", opacity: 0.6 }}>
        {doc.thresholds.map((t, i) => (
          <div key={i}>
            <span style={{ color: "#facc15" }}>{t.range}</span>
            {" → "}{t.meaning}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InfoPanel({ factors, susceptibilityData, sarMetadata, selectedZone, geeResult }) {
  const riskCounts = susceptibilityData
    ? countByRisk(susceptibilityData.features)
    : null;

  return (
    <div className="info-panel">
      {/* ── Header ── */}
      <div className="info-header" style={{ marginBottom: "1rem" }}>
        <h2 className="info-panel-title">SAR Analysis Panel</h2>
        {geeResult && (
          <div className="nasa-badge" style={{ fontSize: "0.65rem", display: "inline-block" }}>
            {geeResult.product_count} GRD acquisitions
          </div>
        )}
      </div>

      {/* ── Stack summary ── */}
      {geeResult && !geeResult.error && (
        <div
          className="card"
          style={{ padding: "0.85rem", marginBottom: "1rem", border: "1px solid rgba(0,255,0,0.15)" }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#4ade80", marginBottom: "0.6rem" }}>
            <i className="fas fa-satellite"></i> Acquisition Stack
          </div>
          <MetricRow label="Orbit pass" value={geeResult.orbit_detected ?? "—"} />
          <MetricRow label="Stack size used" value={geeResult.product_count ?? "—"} />
          <MetricRow label="Total available" value={geeResult.total_available ?? "—"} />
          {riskCounts && (
            <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "0.5rem 0" }} />
              <MetricRow label="High-confidence anomalies" value={riskCounts.very_high ?? 0} color="#ef4444" />
              <MetricRow label="Moderate anomalies" value={riskCounts.moderate ?? 0} color="#facc15" />
              <MetricRow label="Low-confidence anomalies" value={riskCounts.low ?? 0} color="#4ade80" />
            </>
          )}
          <div
            style={{
              fontSize: "0.65rem",
              marginTop: "0.7rem",
              color: "#4ade80",
              opacity: 0.65,
              fontStyle: "italic",
            }}
          >
            Outputs: heuristic backscatter outliers — no phase deformation measured.
          </div>
        </div>
      )}

      {/* ── Selected zone detail ── */}
      {selectedZone ? (
        <div
          className="card"
          style={{
            padding: "0.85rem",
            marginBottom: "1rem",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(20,0,0,0.3)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "bold",
              marginBottom: "0.75rem",
              color: selectedZone.risk === "very_high" ? "#ef4444" : selectedZone.risk === "moderate" ? "#facc15" : "#4ade80",
              textTransform: "uppercase",
            }}
          >
            <i className="fas fa-map-marker-alt"></i>{" "}
            Selected Zone — {selectedZone.risk?.replace("_", " ") ?? "unknown"} confidence
          </div>

          <MetricCard metricKey="confidence" value={`${selectedZone.confidence}%`} />
          <MetricCard metricKey="bci" value={selectedZone.bci} />
          <MetricCard metricKey="isi" value={selectedZone.isi} />
          <MetricCard metricKey="persistence" value={`${selectedZone.persistence} acquisition(s)`} />
        </div>
      ) : (
        susceptibilityData && (
          <div style={{ fontSize: "0.72rem", opacity: 0.6, marginBottom: "1rem", fontStyle: "italic" }}>
            <i className="fas fa-mouse-pointer"></i> Click a map point to inspect its metric breakdown.
          </div>
        )
      )}

      {/* ── Methodology disclosure ── */}
      {sarMetadata && (
        <div
          className="card"
          style={{ padding: "0.85rem", marginBottom: "1rem", border: "1px solid rgba(96,165,250,0.2)" }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#60a5fa", marginBottom: "0.5rem" }}>
            <i className="fas fa-flask"></i> Methodology
          </div>
          <div style={{ fontSize: "0.68rem", opacity: 0.8, lineHeight: 1.55 }}>
            <div><strong>Sensor:</strong> {sarMetadata.satellite}</div>
            <div><strong>Method:</strong> {sarMetadata.method}</div>
            {factors?.sar_summary && (
              <div style={{ marginTop: "0.45rem", opacity: 0.7 }}>{factors.sar_summary}</div>
            )}
          </div>
        </div>
      )}

      {!susceptibilityData && !geeResult && (
        <p className="info-empty">
          <i className="fas fa-search"></i>
          Search a city to begin SAR backscatter screening.
        </p>
      )}

      {geeResult?.error && (
        <div
          style={{
            padding: "0.75rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "6px",
            fontSize: "0.72rem",
            color: "#ef4444",
          }}
        >
          <i className="fas fa-exclamation-triangle"></i> GEE Error: {geeResult.error}
        </div>
      )}
    </div>
  );
}
