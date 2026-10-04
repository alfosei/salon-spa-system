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
      loadAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancel(appointment) {
    const confirmed = window.confirm('Cancel this appointment?');
    if (!confirmed) return;

    setError('');
    try {
      await apiRequest(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      loadAppointments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <BookingForm onBookingCreated={loadAppointments} />
      <h2>Appointments</h2>
      {error && <p className="error-text">{error}</p>}
      <ul>
        {appointments.map((a) => (
          <li key={a.id}>
            {new Date(a.dateTime).toLocaleString()} — {a.client.fullName} with{' '}
            {a.staff.fullName} for {a.service.name} — {a.status}
            {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
              <>
                {' '}
                <button onClick={() => handleCompleteAndPay(a)}>
                  Complete &amp; Collect Payment
                </button>
                <button type="button" onClick={() => handleCancel(a)}>
                  Cancel
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Appointments;