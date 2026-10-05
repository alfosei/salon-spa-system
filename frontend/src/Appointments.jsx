import { useState, useEffect } from 'react';
import { apiRequest } from './api';
import BookingForm from './BookingForm';
import AppointmentGroup from './AppointmentGroup';

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

  const upcoming = appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED');
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED');

  return (
    <div>
      <BookingForm onBookingCreated={loadAppointments} />
      <h2>Appointments</h2>
      {error && <p className="error-text">{error}</p>}
      <AppointmentGroup title="Upcoming" appointments={upcoming} onComplete={handleCompleteAndPay} onCancel={handleCancel} showBoth />
      <AppointmentGroup title="Completed" appointments={completed} showBoth />
      <AppointmentGroup title="Cancelled" appointments={cancelled} showBoth />
      {appointments.length === 0 && <p className="muted-text">No appointments yet.</p>}
    </div>
  );
}

export default Appointments;