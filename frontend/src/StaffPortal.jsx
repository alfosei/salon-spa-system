import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import AttendanceList from './AttendanceList';
import AppointmentGroup from './AppointmentGroup';

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
  const upcoming = appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED');

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <div className="panel-grid">
        <div className="panel panel-compact">
          <h2>Shift</h2>
          <p className="muted-text">
            {openAttendance ? 'You are currently clocked in.' : 'You are not clocked in.'}
          </p>
          {openAttendance ? (
            <button onClick={() => handleClockOut(openAttendance.id)}>Clock Out</button>
          ) : (
            <button onClick={handleClockIn}>Clock In</button>
          )}
        </div>

        <div className="panel">
          <h2>My Appointments</h2>
          <AppointmentGroup title="Upcoming" appointments={upcoming} onComplete={handleCompleteAndPay} showClient />
          <AppointmentGroup title="Completed" appointments={completed} showClient />
          <AppointmentGroup title="Cancelled" appointments={cancelled} showClient />
          {appointments.length === 0 && <p className="muted-text">No appointments yet.</p>}
        </div>

        <div className="panel">
          <h2>My Attendance</h2>
          <AttendanceList records={attendance} />
        </div>
      </div>
    </>
  );
}

export default StaffPortal;