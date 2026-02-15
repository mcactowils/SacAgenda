const { query } = require('../../../lib/db');
const { hashPassword, generateToken } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Check if this is the first user (auto-approve as admin)
    const userCount = await query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;

    const hashedPassword = await hashPassword(password);

    const result = await query(
      'INSERT INTO users (username, email, password_hash, full_name, role, approved) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, role, approved',
      [username, email, hashedPassword, fullName, isFirstUser ? 'ADMIN' : 'VIEWER', isFirstUser]
    );

    const user = result.rows[0];

    // If first user, create a token for immediate login
    if (isFirstUser) {
      const token = generateToken(user.id);

      // Save session
      await query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
      );

      res.json({ success: true, user, token, isFirstUser: true });
    } else {
      res.json({ success: true, user, requiresApproval: true });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}