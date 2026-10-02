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

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Clients</h2>
      <ul>
        {clients.map((client) => (
          <li key={client.id}>
            {client.fullName} ({client.user.email}) — {client.phone || 'no phone'}
            {spendingMap[client.id] && (
              <> — {spendingMap[client.id].totalSessions} sessions, GH₵{spendingMap[client.id].totalSpent} total</>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Clients;