const { query } = require('../../../lib/db');
const { authenticateRequest } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const token = req.headers.authorization?.split(' ')[1];

    // Remove session from database
    await query('DELETE FROM user_sessions WHERE token = $1', [token]);

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
}