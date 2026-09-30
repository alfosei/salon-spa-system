import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import Appointments from './Appointments';
import Services from './Services';
import ClientPortal from './ClientPortal';
import { getUserRole } from './api';

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));

  function handleLogout() {
    localStorage.removeItem('token');
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  const role = getUserRole();

  return (
    <div>
      <h1>Salon & Spa</h1>
      <button onClick={handleLogout}>Log Out</button>

      {role === 'CLIENT' ? (
        <ClientPortal />
      ) : (
        <>
          <Dashboard />
          <Appointments />
          <Services />
        </>
      )}
    </div>
  );
}

export default App;