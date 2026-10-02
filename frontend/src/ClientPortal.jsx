import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import Advisor from './Advisor';

function ClientPortal() {
  const [appointments, setAppointments] = useState([]);
  const [spending, setSpending] = useState(null);
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

  return (
    <div>
      <h2>My Dashboard</h2>

      {spending && (
        <p>
          {spending.totalSessions} Sessions — GH₵{spending.totalSpent} Total Spent
        </p>
      )}

      <h3>Book an Appointment</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
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
      <Advisor />
      <h3>My Appointments</h3>
      <ul>
        {appointments.map((a) => (
          <li key={a.id}>
            {new Date(a.dateTime).toLocaleString()} — {a.service.name} with {a.staff.fullName} — {a.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientPortal;