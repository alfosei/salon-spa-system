import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function StaffPortal() {
  const [appointments, setAppointments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function loadData() {
    apiRequest('/api/appointments/staff/my').then(setAppointments).catch((err) => setError(err.message));
    apiRequest('/api/attendance/my').then(setAttendance).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleClockIn() {
    setError('');
    setMessage('');
    try {
      await apiRequest('/api/attendance/clock-in', { method: 'POST' });
      setMessage('Clocked in.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClockOut(attendanceId) {
    setError('');
    setMessage('');
    try {
      await apiRequest(`/api/attendance/${attendanceId}/clock-out`, { method: 'PUT' });
      setMessage('Clocked out.');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markCompleted(appointmentId) {
    setError('');
    try {
      await apiRequest(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const openAttendance = attendance.find((a) => !a.clockOut);

  return (
    <div>
      <h2>My Dashboard</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <div>
        {openAttendance ? (
          <button onClick={() => handleClockOut(openAttendance.id)}>Clock Out</button>
        ) : (
          <button onClick={handleClockIn}>Clock In</button>
        )}
      </div>

      <h3>My Appointments</h3>
      <ul>
        {appointments.map((a) => (
          <li key={a.id}>
            {new Date(a.dateTime).toLocaleString()} — {a.client.fullName} — {a.service.name} — {a.status}
            {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
              <> <button onClick={() => markCompleted(a.id)}>Mark Completed</button></>
            )}
          </li>
        ))}
      </ul>

      <h3>My Attendance</h3>
      <ul>
        {attendance.map((a) => (
          <li key={a.id}>
            In: {new Date(a.clockIn).toLocaleString()} — Out: {a.clockOut ? new Date(a.clockOut).toLocaleString() : 'still clocked in'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StaffPortal;