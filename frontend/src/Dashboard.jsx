import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/dashboard')
      .then((data) => setStats(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error-text">{error}</p>;
  if (!stats) return <p className="muted-text">Loading dashboard…</p>;

  return (
    <div className="panel panel-stats">
      <h2>Today — {stats.date}</h2>
      <div className="stat-grid">
        <StatCard label="Revenue" value={`GH₵${stats.todayRevenue}`} />
        <StatCard label="Appointments" value={stats.appointmentsToday} />
        <StatCard label="Completed" value={stats.completedToday} />
        <StatCard label="Pending" value={stats.pendingAppointments} />
        <StatCard label="Cancelled" value={stats.cancelledAppointments} />
        <StatCard label="Total Clients" value={stats.totalClients} />
        <StatCard label="New Clients" value={stats.newClientsToday} />
        <StatCard label="Staff On Shift" value={stats.staffClockedInToday} />
      </div>
    </div>
  );
}

export default Dashboard;