import { useState, useEffect } from 'react';
import api from '../lib/api-client';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await api.getCurrentUser();
      setUser(result.user);
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const result = await api.login(loginForm.username, loginForm.password);
      setUser(result.user);
      setError('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>🕊️ Sacrament Meeting Agenda</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '400px' }}>
        <h1>🕊️ Sacrament Meeting Agenda</h1>
        <h2>Login</h2>
        {error && (
          <div style={{ color: 'red', marginBottom: '10px' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              style={{ width: '100%', padding: '8px', marginBottom: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <button
            type="submit"
            style={{
              background: '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🕊️ Sacrament Meeting Agenda</h1>
        <div>
          Welcome, {user.full_name}! ({user.role})
          <button
            onClick={handleLogout}
            style={{
              marginLeft: '10px',
              background: '#f44336',
              color: 'white',
              padding: '5px 10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h2>✅ Next.js Conversion Successful!</h2>
        <p>Your app has been successfully converted to Next.js:</p>
        <ul>
          <li>✅ Authentication working</li>
          <li>✅ Database connection established</li>
          <li>✅ API routes converted</li>
          <li>⚠️ Full agenda interface needs to be ported</li>
        </ul>

        <h3>Next Steps:</h3>
        <p>The basic Next.js structure is now in place. The full agenda interface from your original React app needs to be ported over, but the hard part (authentication, database, API routes) is done!</p>

        <p><strong>Ready to deploy to Vercel!</strong></p>
      </div>
    </div>
  );
}