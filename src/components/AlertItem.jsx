export default function AlertItem({ title, severity, location, time }) {
  return (
    <div className={`alert-item ${severity}`}>
      <div className="alert-header-row">
        <div className="alert-title">{title}</div>
        <span className={`alert-severity ${severity}`}>
          {severity.toUpperCase()}
        </span>
      </div>
      <div className="alert-location">
        <i className="fas fa-map-pin"></i> {location}
      </div>
      <div className="alert-time">{time}</div>
    </div>
  );
}
