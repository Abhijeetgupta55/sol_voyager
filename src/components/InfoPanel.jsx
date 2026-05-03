import DeformationChart from "./DeformationChart";

export default function InfoPanel({ factors, susceptibilityData, insarMetadata, selectedZone, realProducts, geeResult }) {
  const highRisk = susceptibilityData
    ? susceptibilityData.features.filter((f) => f.properties.risk === "very_high").length
    : null;
  const modRisk = susceptibilityData
    ? susceptibilityData.features.filter((f) => f.properties.risk === "moderate").length
    : null;

  return (
    <div className="info-panel">
      <div className="info-header" style={{ marginBottom: "1rem" }}>
        <h2 className="info-panel-title">InSAR Analysis Factors</h2>
        {geeResult && (
          <div className="nasa-badge" style={{ fontSize: "0.65rem", display: "inline-block" }}>
            Stack: {geeResult.product_count} SLC Products
          </div>
        )}
      </div>
      
      {geeResult && (
        <div className="anomaly-report card" style={{ padding: "1rem", marginBottom: "1rem", border: "1px solid rgba(0,255,0,0.2)", background: "rgba(0,20,0,0.3)" }}>
          <h3 className="info-risk-title" style={{ color: "#4ade80", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <i className="fas fa-cloud-upload-alt"></i> GEE Research Engine
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="metric">
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Mean Log-Ratio</span>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#4ade80" }}>
                {geeResult.mean_log_ratio?.toFixed(4)}
              </div>
            </div>
            <div className="metric">
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Temporal Variance</span>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#4ade80" }}>
                {geeResult.mean_variance?.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      )}



      {realProducts && realProducts.length > 0 && (

        <div className="real-data-source" style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
          <h3 className="info-risk-title" style={{ fontSize: "0.85rem", color: "#60a5fa" }}>
            <i className="fas fa-link"></i> Real Satellite Source Files
          </h3>
          <p style={{ fontSize: "0.7rem", opacity: 0.6, marginBottom: "0.5rem" }}>
            These are the actual .SAFE files from Copernicus for this location:
          </p>
          <div className="product-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {realProducts.map((p, i) => (
              <a 
                key={i} 
                href={p.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="product-link card"
                style={{ fontSize: "0.65rem", padding: "0.5rem", textDecoration: "none", color: "inherit", background: "rgba(255,255,255,0.05)" }}
              >
                <div style={{ fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem", opacity: 0.7 }}>
                  <span>{p.date.split('T')[0]}</span>
                  <span>{p.size}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!susceptibilityData && (
        <p className="info-empty">
          <i className="fas fa-search"></i>
          Initiate satellite query to begin analysis.
        </p>
      )}
    </div>
  );
}



