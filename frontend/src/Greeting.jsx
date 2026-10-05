import { useState, useEffect } from 'react';
import { apiRequest, getUserRole } from './api';

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Greeting() {
  const role = getUserRole();
  const [name, setName] = useState('');

  useEffect(() => {
    if (role === 'CLIENT') {
      apiRequest('/api/clients/me')
        .then((data) => setName(data.fullName.split(' ')[0]))
        .catch(() => {});
    } else if (role === 'STAFF') {
      apiRequest('/api/staff/me')
        .then((data) => setName(data.fullName.split(' ')[0]))
        .catch(() => {});
    } else if (role === 'ADMIN') {
      apiRequest('/api/users/me')
        .then((data) => setName(data.email.split('@')[0]))
        .catch(() => {});
    }
  }, [role]);

  return (
    <h2 className="greeting">
      {timeGreeting()}
      {name && <>, <span className="accent-text">{name}</span></>}
    </h2>
  );
}

export default Greeting;