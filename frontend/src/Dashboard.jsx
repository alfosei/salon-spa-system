import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/dashboard')
      .then((data) => setStats(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <div>
      <h2>Dashboard — {stats.date}</h2>
      <ul>
        <li>Today's Revenue: GH₵{stats.todayRevenue}</li>
        <li>Appointments Today: {stats.appointmentsToday}</li>
        <li>Completed Today: {stats.completedToday}</li>
        <li>Pending Appointments: {stats.pendingAppointments}</li>
        <li>Cancelled Appointments: {stats.cancelledAppointments}</li>
        <li>Total Clients: {stats.totalClients}</li>
        <li>New Clients Today: {stats.newClientsToday}</li>
        <li>Staff Clocked In Today: {stats.staffClockedInToday}</li>
      </ul>
    </div>
  );
}

export default Dashboard;