import { formatDateTime } from './format';

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}

function AppointmentGroup({ title, appointments, onComplete, onCancel, showClient, showBoth }) {
  if (appointments.length === 0) return null;

  return (
    <div className="appointment-group">
      <h3>{title}</h3>
      <ul className="appointment-list">
        {appointments.map((a) => {
          const canAct = a.status !== 'COMPLETED' && a.status !== 'CANCELLED';
          return (
            <li key={a.id} className="appointment-card">
              <div className="appointment-card-main">
                <div className="appointment-service">{a.service.name}</div>
                <div className="appointment-with muted-text">
                  {showBoth
                    ? `${a.client.fullName} · ${a.staff.fullName}`
                    : showClient
                    ? a.client.fullName
                    : a.staff.fullName}
                </div>
                <div className="appointment-time muted-text">{formatDateTime(a.dateTime)}</div>
              </div>
              <div className="appointment-card-side">
                <StatusBadge status={a.status} />
                {canAct && (onComplete || onCancel) && (
                  <div className="appointment-actions">
                    {onComplete && (
                      <button onClick={() => onComplete(a)}>Complete &amp; Collect Payment</button>
                    )}
                    {onCancel && (
                      <button type="button" onClick={() => onCancel(a)}>Cancel</button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default AppointmentGroup;