import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import Services from './Services';
import Appointments from './Appointments';

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));

  function handleLogout() {
    localStorage.removeItem('token');
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <div>
      <h1>Salon & Spa</h1>
      <button onClick={handleLogout}>Log Out</button>
      <Dashboard />
      <Appointments />
      <Services />
    </div>
  );
}

export default App;