import { useState, useEffect } from 'react';
import { apiRequest } from './api';

function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');

  function loadStaff() {
    apiRequest('/api/staff').then(setStaff).catch((err) => setError(err.message));
  }

  function loadAttendance() {
    apiRequest('/api/attendance').then(setAttendance).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadStaff();
    loadAttendance();
  }, []);

  async function handleCreateStaff(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const newUser = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: 'STAFF' }),
      });

      await apiRequest('/api/staff', {
        method: 'POST',
        body: JSON.stringify({ userId: newUser.id, fullName, position }),
      });

      setSuccess('Staff member added!');
      setEmail('');
      setPassword('');
      setFullName('');
      setPosition('');
      loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive(member) {
    setError('');
    try {
      await apiRequest(`/api/staff/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: member.fullName,
          position: member.position,
          isActive: !member.isActive,
        }),
      });
      loadStaff();
    } catch (err) {
      setError(err.message);
    }
  }

  function isClockedIn(staffId) {
    return attendance.some((a) => a.staffId === staffId && !a.clockOut);
  }

  // Group attendance records by staff member, so each person's history
  // can be rendered nested under their own name.
  const attendanceByStaff = {};
  attendance.forEach((a) => {
    if (!attendanceByStaff[a.staffId]) {
      attendanceByStaff[a.staffId] = {
        fullName: a.staff.fullName,
        records: [],
      };
    }
    attendanceByStaff[a.staffId].records.push(a);
  });

  return (
    <div>
      <h2>Staff Management</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <ul>
        {staff.map((member) => (
          <li key={member.id}>
            {member.fullName} — {member.position} — {member.user.email}
            <br />
            Employment: {member.isActive ? 'Active' : 'Inactive'}{' '}
            <button onClick={() => toggleActive(member)}>
              {member.isActive ? 'Deactivate' : 'Activate'}
            </button>
            {' '}| Shift: {isClockedIn(member.id) ? 'On Shift' : 'Off Shift'}
          </li>
        ))}
      </ul>

      <h3>Hire New Staff</h3>
      <form onSubmit={handleCreateStaff}>
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Temporary Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Add Staff</button>
      </form>

      <h3>Attendance by Staff Member</h3>
      {Object.values(attendanceByStaff).map((group) => (
        <div key={group.fullName}>
          <h4>{group.fullName}</h4>
          <ul>
            {group.records.map((a) => (
              <li key={a.id}>
                In: {new Date(a.clockIn).toLocaleString()} — Out:{' '}
                {a.clockOut ? new Date(a.clockOut).toLocaleString() : 'still clocked in'}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default StaffManagement;