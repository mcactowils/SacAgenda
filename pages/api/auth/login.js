const { query } = require('../../../lib/db');
const { verifyPassword, generateToken } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    const result = await query(
      'SELECT id, username, email, password_hash, full_name, role, approved FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.approved) {
      return res.status(403).json({ error: 'Account pending approval' });
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    // Clean up old sessions and save new one
    await query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);
    await query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword, token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}