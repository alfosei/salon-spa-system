import { useState, useEffect } from 'react';
import { apiRequest, getUserRole } from './api';

function Services() {
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [editingId, setEditingId] = useState(null);

  const isAdmin = getUserRole() === 'ADMIN';

  function loadServices() {
    apiRequest('/api/services')
      .then(setServices)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadServices();
  }, []);

  function startEdit(service) {
    setEditingId(service.id);
    setName(service.name);
    setCategory(service.category);
    setPrice(service.price);
    setDuration(service.duration);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setCategory('');
    setPrice('');
    setDuration('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const payload = {
      name,
      category,
      price: Number(price),
      duration: Number(duration),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/services/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      loadServices();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete this service?');
    if (!confirmed) return;

    try {
      await apiRequest(`/api/services/${id}`, { method: 'DELETE' });
      loadServices();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Services</h2>
      {error && <p className="error-text">{error}</p>}

      <ul className="appointment-list">
        {services.map((service) => (
          <li key={service.id} className="appointment-card">
            <div className="appointment-card-main">
              <div className="appointment-service">{service.name}</div>
              <div className="appointment-with muted-text">
                {service.category} · {service.duration} min
              </div>
            </div>
            <div className="appointment-card-side">
              <span className="status-badge status-confirmed">GH₵{service.price}</span>
              {isAdmin && (
                <div className="appointment-actions">
                  <button onClick={() => startEdit(service)}>Edit</button>
                  <button type="button" onClick={() => handleDelete(service.id)}>Delete</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isAdmin && (
        <form onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit Service' : 'Add Service'}</h3>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Duration (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
          <button type="submit">{editingId ? 'Save Changes' : 'Add Service'}</button>
          {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
        </form>
      )}
    </div>
  );
}

export default Services;