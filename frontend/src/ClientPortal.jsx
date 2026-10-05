import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import { formatDateTime } from './format';
import Advisor from './Advisor';
import AppointmentGroup from './AppointmentGroup';

function ClientPortal() {
  const [appointments, setAppointments] = useState([]);
  const [spending, setSpending] = useState(null);
  const [payments, setPayments] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function loadData() {
    apiRequest('/api/appointments/my').then(setAppointments).catch((err) => setError(err.message));
    apiRequest('/api/clients/me/spending').then(setSpending).catch((err) => setError(err.message));
    apiRequest('/api/clients/me/payments').then(setPayments).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadData();
    apiRequest('/api/services').then(setServices).catch((err) => setError(err.message));
    apiRequest('/api/staff/directory').then(setStaff).catch((err) => setError(err.message));
  }, []);

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/appointments/my', {
        method: 'POST',
        body: JSON.stringify({
          staffId: Number(staffId),
          serviceId: Number(serviceId),
          dateTime,
        }),
      });

      setSuccess('Appointment booked!');
      setServiceId('');
      setStaffId('');
      setDateTime('');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePayNow(appointment) {
    setError('');
    try {
      const data = await apiRequest(`/api/appointments/${appointment.id}/initiate-payment`, {
        method: 'POST',
      });
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelMine(appointment) {
    const confirmed = window.confirm('Cancel this appointment?');
    if (!confirmed) return;

    setError('');
    try {
      await apiRequest(`/api/appointments/my/${appointment.id}/cancel`, { method: 'PUT' });
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const upcoming = appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED');

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <div className="panel-grid">
        <div className="panel panel-compact">
          <h2>Overview</h2>
          {spending ? (
            <p>{spending.totalSessions} Sessions — GH₵{spending.totalSpent} Total Spent</p>
          ) : (
            <p className="muted-text">Loading…</p>
          )}
        </div>

        <div className="panel">
          <h2>Book an Appointment</h2>
          <form onSubmit={handleBook}>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — GH₵{s.price}</option>
              ))}
            </select>

            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
              <option value="">Select a staff member</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.position})</option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <button type="submit">Book</button>
          </form>
        </div>

        <div className="panel">
          <h2>My Appointments</h2>
          <AppointmentGroup title="Upcoming" appointments={upcoming} onPayNow={handlePayNow} onCancel={handleCancelMine} />
          <AppointmentGroup title="Completed" appointments={completed} />
          <AppointmentGroup title="Cancelled" appointments={cancelled} />
          {appointments.length === 0 && <p className="muted-text">No appointments yet.</p>}
        </div>

        <div className="panel">
          <h2>Payment History</h2>
          {payments.length === 0 ? (
            <p className="muted-text">No payments yet.</p>
          ) : (
            <ul className="appointment-list">
              {payments.map((p) => (
                <li key={p.id} className="appointment-card">
                  <div className="appointment-card-main">
                    <div className="appointment-service">{p.appointment.service.name}</div>
                    <div className="appointment-with muted-text">with {p.appointment.staff.fullName}</div>
                    <div className="appointment-time muted-text">{formatDateTime(p.paidAt)}</div>
                  </div>
                  <div className="appointment-card-side">
                    <span className="status-badge status-completed">GH₵{p.amount}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <Advisor />
        </div>
      </div>
    </>
  );
}

export default ClientPortal;