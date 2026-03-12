export default function StatCard({ icon, label, value, change, changeIcon, variant }) {
  return (
    <div className={`stat-card ${variant || ""}`}>
      <div className="stat-header">
        <div className="stat-icon">
          <i className={icon}></i>
        </div>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-change">
        <i className={changeIcon}></i> {change}
      </div>
    </div>
  );
}
