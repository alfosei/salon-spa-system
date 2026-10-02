import { useState } from 'react';
import { apiRequest } from './api';

function Advisor() {
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAsk(e) {
    e.preventDefault();
    setError('');
    setReply('');
    setLoading(true);

    try {
      const data = await apiRequest('/api/advisor', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      setReply(data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Beauty & Wellness Advisor</h2>
      <form onSubmit={handleAsk}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you're looking for..."
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {reply && <p>{reply}</p>}
    </div>
  );
}

export default Advisor;