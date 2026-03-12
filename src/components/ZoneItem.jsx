export default function ZoneItem({ name, status, statusLabel, details }) {
  return (
    <div className="zone-item">
      <div className="zone-header">
        <div className="zone-name">{name}</div>
        <span className={`zone-status ${status}`}>{statusLabel}</span>
      </div>
      <div className="zone-details">{details}</div>
    </div>
  );
}
