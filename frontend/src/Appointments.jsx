import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import BookingForm from './BookingForm';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');

  function loadAppointments() {
    apiRequest('/api/appointments')
      .then((data) => setAppointments(data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <BookingForm onBookingCreated={loadAppointments} />
      <h2>Appointments</h2>
      <ul>
        {appointments.map((a) => (
          <li key={a.id}>
            {new Date(a.dateTime).toLocaleString()} — {a.client.fullName} with{' '}
            {a.staff.fullName} for {a.service.name} — {a.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Appointments;