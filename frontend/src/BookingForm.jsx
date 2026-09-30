import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function BookingForm({ onBookingCreated }) {
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);

  const [clientId, setClientId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiRequest('/api/clients').then(setClients).catch((err) => setError(err.message));
    apiRequest('/api/staff').then(setStaff).catch((err) => setError(err.message));
    apiRequest('/api/services').then(setServices).catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clientId: Number(clientId),
          staffId: Number(staffId),
          serviceId: Number(serviceId),
          dateTime,
        }),
      });

      setSuccess('Appointment booked!');
      setClientId('');
      setStaffId('');
      setServiceId('');
      setDateTime('');
      onBookingCreated();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Book Appointment</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div>
        <label>Client</label>
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
          <option value="">Select a client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Staff</label>
        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Service</label>
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
          <option value="">Select a service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — GH₵{s.price}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Date & Time</label>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          required
        />
      </div>

      <button type="submit">Book</button>
    </form>
  );
}

export default BookingForm;