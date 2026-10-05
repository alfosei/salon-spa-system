import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import Appointments from './Appointments';
import Services from './Services';
import Clients from './Clients';
import StaffManagement from './StaffManagement';
import ClientPortal from './ClientPortal';
import StaffPortal from './StaffPortal';
import Settings from './Settings';
import Greeting from './Greeting';
import { getUserRole } from './api';

function formatRole(role) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [showSettings, setShowSettings] = useState(false);

  function handleLogout() {
    localStorage.removeItem('token');
    setLoggedIn(false);
  }

  if (!loggedIn) {
    return (
      <div className="auth-shell">
        <div className="brand-mark">
          <h1>OZEL</h1>
          <p className="muted-text">Salon &amp; Spa</p>
        </div>
        <Login onLoginSuccess={() => setLoggedIn(true)} />
      </div>
    );
  }

  const role = getUserRole();

  return (
    <div>
      <div className="app-header">
        <div className="brand-mark">
          <h1>OZEL</h1>
          <p className="muted-text">Salon &amp; Spa</p>
        </div>
        <div className="header-right">
          <span className="role-badge">{formatRole(role)}</span>
          <button type="button" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? '← Back' : 'Settings'}
          </button>
          <button type="button" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      <div className="app-content">
        <Greeting />

        {showSettings ? (
          <div className="narrow-content">
            <Settings />
          </div>
        ) : (
          <>
            {role === 'CLIENT' && (
              <div className="portal-content">
                <ClientPortal />
              </div>
            )}
            {role === 'STAFF' && (
              <div className="portal-content">
                <StaffPortal />
              </div>
            )}
            {role === 'ADMIN' && (
              <div className="dashboard-grid">
                <Dashboard />
                <div className="panel panel-appointments">
                  <Appointments />
                </div>
                <div className="panel panel-clients">
                  <Clients />
                </div>
                <div className="panel panel-staff">
                  <StaffManagement />
                </div>
                <div className="panel panel-services">
                  <Services />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;