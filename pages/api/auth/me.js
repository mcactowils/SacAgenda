const { authenticateRequest } = require('../../../lib/auth');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    res.json({ user: authResult.user });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}