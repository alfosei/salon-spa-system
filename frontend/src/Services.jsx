import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/services')
      .then((data) => setServices(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Services</h2>
      <ul>
        {services.map((service) => (
          <li key={service.id}>
            {service.name} — GH₵{service.price} ({service.duration} min)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Services;