import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function BookingForm({ onBookingCreated }) {
  const [mode, setMode] = useState('existing'); // 'existing' or 'new'

  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);

  const [clientId, setClientId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function loadClients() {
    apiRequest('/api/clients').then(setClients).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadClients();
    apiRequest('/api/staff').then(setStaff).catch((err) => setError(err.message));
    apiRequest('/api/services').then(setServices).catch((err) => setError(err.message));
  }, []);

  function resetForm() {
    setClientId('');
    setNewEmail('');
    setNewPassword('');
    setNewFullName('');
    setNewPhone('');
    setStaffId('');
    setServiceId('');
    setDateTime('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let finalClientId = clientId;

      if (mode === 'new') {
        const newUser = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            role: 'CLIENT',
          }),
        });

        const newClient = await apiRequest('/api/clients', {
          method: 'POST',
          body: JSON.stringify({
            userId: newUser.id,
            fullName: newFullName,
            phone: newPhone,
          }),
        });

        finalClientId = newClient.id;
        loadClients();
      }

      await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          clientId: Number(finalClientId),
          staffId: Number(staffId),
          serviceId: Number(serviceId),
          dateTime,
        }),
      });

      setSuccess('Appointment booked!');
      resetForm();
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
        <label>
          <input
            type="radio"
            checked={mode === 'existing'}
            onChange={() => setMode('existing')}
          />
          Existing Client
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'new'}
            onChange={() => setMode('new')}
          />
          New Client
        </label>
      </div>

      {mode === 'existing' ? (
        <div>
          <label>Client</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div>
            <label>Client Name</label>
            <input
              type="text"
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Temporary Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
        </>
      )}

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