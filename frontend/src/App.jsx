import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import Services from './Services';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <div>
      <h1>Salon & Spa</h1>
      <Dashboard />
      <Services />
    </div>
  );
}

export default App;