const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { query } = require('./db');

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: 'Access token required', status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid token', status: 403 };
  }

  // Verify user still exists and is approved
  const userResult = await query(
    'SELECT id, username, email, full_name, role, approved FROM users WHERE id = $1 AND approved = true',
    [decoded.userId]
  );

  if (userResult.rows.length === 0) {
    return { error: 'User not found or not approved', status: 403 };
  }

  return { user: userResult.rows[0] };
}

function requireRole(roles) {
  return (user) => {
    if (!roles.includes(user.role)) {
      return { error: 'Insufficient permissions', status: 403 };
    }
    return null;
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticateRequest,
  requireRole
};