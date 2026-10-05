import { formatDateOnly, formatTimeOnly } from './format';

function AttendanceList({ records }) {
  if (records.length === 0) {
    return <p className="muted-text">No attendance records yet.</p>;
  }

  return (
    <ul className="appointment-list">
      {records.map((a) => {
        const clockIn = new Date(a.clockIn);
        const clockOut = a.clockOut ? new Date(a.clockOut) : null;
        let duration = null;

        if (clockOut) {
          const totalMinutes = Math.round((clockOut - clockIn) / 60000);
          const hrs = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          duration = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        }

        return (
          <li key={a.id} className="appointment-card">
            <div className="appointment-card-main">
              <div className="appointment-service">{formatDateOnly(clockIn)}</div>
              <div className="appointment-time muted-text">
                {formatTimeOnly(clockIn)} – {clockOut ? formatTimeOnly(clockOut) : 'now'}
              </div>
            </div>
            <div className="appointment-card-side">
              {clockOut ? (
                <span className="status-badge status-completed">{duration}</span>
              ) : (
                <span className="status-badge status-confirmed">On Shift</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default AttendanceList;