import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function Clients() {
  const [clients, setClients] = useState([]);
  const [spendingMap, setSpendingMap] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/clients')
      .then(async (data) => {
        setClients(data);

        const spendingResults = await Promise.all(
          data.map((client) =>
            apiRequest(`/api/clients/${client.id}/spending`).then((spending) => ({
              id: client.id,
              spending,
            }))
          )
        );

        const map = {};
        spendingResults.forEach((result) => {
          map[result.id] = result.spending;
        });
        setSpendingMap(map);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      <h2>Clients</h2>
      <ul className="appointment-list">
        {clients.map((client) => (
          <li key={client.id} className="appointment-card">
            <div className="appointment-card-main">
              <div className="appointment-service">{client.fullName}</div>
              <div className="appointment-with muted-text">{client.user.email}</div>
              <div className="appointment-time muted-text">{client.phone || 'No phone on file'}</div>
            </div>
            <div className="appointment-card-side">
              {spendingMap[client.id] && (
                <>
                  <span className="status-badge status-completed">
                    GH₵{spendingMap[client.id].totalSpent}
                  </span>
                  <span className="muted-text" style={{ fontSize: '0.8rem' }}>
                    {spendingMap[client.id].totalSessions} sessions
                  </span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Clients;