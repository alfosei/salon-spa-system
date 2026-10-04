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

  async function handleCompleteAndPay(appointment) {
    const defaultAmount = appointment.service.price;
    const input = window.prompt(`Amount paid for ${appointment.service.name}?`, defaultAmount);

    if (input === null) return;

    const amount = Number(input);
    if (Number.isNaN(amount)) {
      setError('Enter a valid number for the payment amount.');
      return;
    }

    setError('');
    try {
      await apiRequest(`/api/appointments/${appointment.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
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
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

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
              <> <button onClick={() => handleCompleteAndPay(a)}>Complete &amp; Collect Payment</button></>
            )}
          </li>
        ))}
      </ul>

      <h3>My Attendance</h3>
      <ul>
        {attendance.map((a) => (
          <li key={a.id}>
            In: {new Date(a.clockIn).toLocaleString()} — Out:{' '}
            {a.clockOut ? new Date(a.clockOut).toLocaleString() : 'still clocked in'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StaffPortal;