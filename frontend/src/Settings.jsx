import { useState, useEffect } from 'react';
import { apiRequest, getUserRole } from './api';

function Settings() {
  const role = getUserRole();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (role === 'CLIENT') {
      apiRequest('/api/clients/me')
        .then((data) => {
          setFullName(data.fullName);
          setPhone(data.phone || '');
          setNewEmail(data.user.email);
        })
        .catch((err) => setError(err.message));
    } else if (role === 'STAFF') {
      apiRequest('/api/staff/me')
        .then((data) => {
          setFullName(data.fullName);
          setNewEmail(data.user.email);
        })
        .catch((err) => setError(err.message));
    }
  }, [role]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (role === 'CLIENT') {
        await apiRequest('/api/clients/me', {
          method: 'PUT',
          body: JSON.stringify({ fullName, phone }),
        });
      } else if (role === 'STAFF') {
        await apiRequest('/api/staff/me', {
          method: 'PUT',
          body: JSON.stringify({ fullName }),
        });
      }
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEmailSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/users/me/email', {
        method: 'PUT',
        body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
      });
      setSuccess('Email updated.');
      setEmailPassword('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiRequest('/api/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel">
      <h2>Account Settings</h2>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      {(role === 'CLIENT' || role === 'STAFF') && (
        <>
          <h3>Profile</h3>
          <form onSubmit={handleProfileSave}>
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            {role === 'CLIENT' && (
              <>
                <label>Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </>
            )}
            <button type="submit">Save Profile</button>
          </form>
        </>
      )}

      <h3>Email</h3>
      <form onSubmit={handleEmailSave}>
        <label>New Email</label>
        <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
        <label>Current Password (to confirm)</label>
        <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} required />
        <button type="submit">Update Email</button>
      </form>

      <h3>Password</h3>
      <form onSubmit={handlePasswordSave}>
        <label>Current Password</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <label>New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
}

export default Settings;