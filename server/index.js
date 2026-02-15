import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect()
  .then(() => console.log('📀 Connected to PostgreSQL database'))
  .catch(err => console.error('❌ Database connection error:', err));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || true)
    : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// JWT middleware for protected routes
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is approved
    const userResult = await pool.query(
      'SELECT id, username, email, full_name, role, approved FROM users WHERE id = $1 AND approved = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found or not approved' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Check if this is the first user (auto-approve as admin)
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, role, approved) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, role, approved',
      [username, email, hashedPassword, fullName, isFirstUser ? 'ADMIN' : 'VIEWER', isFirstUser]
    );

    const user = result.rows[0];

    // If first user, create a token for immediate login
    if (isFirstUser) {
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Save session
      await pool.query(
        'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
      );

      res.json({ success: true, user, token, isFirstUser: true });
    } else {
      res.json({ success: true, user, requiresApproval: true });
    }

    // Broadcast user update to all clients
    broadcastToClients({ type: 'USER_REGISTERED', user });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
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

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Clean up old sessions and save new one
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
    );

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword, token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout user
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];

    // Remove session from database
    await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Verify token and get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT ROUTES (Admin only)
// ═══════════════════════════════════════════════════════════════════════════════

// Get all users
app.get('/api/users', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, approved, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Approve user
app.put('/api/users/:id/approve', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE users SET approved = true WHERE id = $1 RETURNING id, username, email, full_name, role, approved',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json(user);

    // Broadcast user update
    broadcastToClients({ type: 'USER_APPROVED', user });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Update user role
app.put('/api/users/:id/role', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, full_name, role, approved',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json(user);

    // Broadcast user update
    broadcastToClients({ type: 'USER_ROLE_UPDATED', user });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Remove user
app.delete('/api/users/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });

    // Broadcast user removal
    broadcastToClients({ type: 'USER_REMOVED', userId: id });

  } catch (error) {
    console.error('Remove user error:', error);
    res.status(500).json({ error: 'Failed to remove user' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NAME GROUPS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all name groups
app.get('/api/names', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT category, name FROM name_groups ORDER BY category, name'
    );

    const nameGroups = {
      presiding: [],
      conducting: [],
      chorister: [],
      organist: []
    };

    result.rows.forEach(row => {
      nameGroups[row.category].push(row.name);
    });

    res.json(nameGroups);
  } catch (error) {
    console.error('Get names error:', error);
    res.status(500).json({ error: 'Failed to get names' });
  }
});

// Add name to group
app.post('/api/names', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const { category, name } = req.body;

    if (!['presiding', 'conducting', 'chorister', 'organist'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Check if name already exists in category
    const existing = await pool.query(
      'SELECT id FROM name_groups WHERE category = $1 AND name = $2',
      [category, name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Name already exists in this category' });
    }

    await pool.query(
      'INSERT INTO name_groups (category, name, created_by) VALUES ($1, $2, $3)',
      [category, name, req.user.id]
    );

    // Get updated name groups
    const result = await pool.query(
      'SELECT category, name FROM name_groups ORDER BY category, name'
    );

    const nameGroups = {
      presiding: [],
      conducting: [],
      chorister: [],
      organist: []
    };

    result.rows.forEach(row => {
      nameGroups[row.category].push(row.name);
    });

    res.json(nameGroups);

    // Broadcast update
    broadcastToClients({ type: 'NAMES_UPDATED', nameGroups });

  } catch (error) {
    console.error('Add name error:', error);
    res.status(500).json({ error: 'Failed to add name' });
  }
});

// Remove name from group
app.delete('/api/names/:category/:name', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const { category, name } = req.params;

    await pool.query(
      'DELETE FROM name_groups WHERE category = $1 AND name = $2',
      [category, decodeURIComponent(name)]
    );

    // Get updated name groups
    const result = await pool.query(
      'SELECT category, name FROM name_groups ORDER BY category, name'
    );

    const nameGroups = {
      presiding: [],
      conducting: [],
      chorister: [],
      organist: []
    };

    result.rows.forEach(row => {
      nameGroups[row.category].push(row.name);
    });

    res.json(nameGroups);

    // Broadcast update
    broadcastToClients({ type: 'NAMES_UPDATED', nameGroups });

  } catch (error) {
    console.error('Remove name error:', error);
    res.status(500).json({ error: 'Failed to remove name' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM HYMNS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get all custom hymns
app.get('/api/hymns', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT number, title FROM custom_hymns ORDER BY CAST(number AS INTEGER)'
    );

    const hymns = {};
    result.rows.forEach(row => {
      hymns[row.number] = row.title;
    });

    res.json(hymns);
  } catch (error) {
    console.error('Get hymns error:', error);
    res.status(500).json({ error: 'Failed to get hymns' });
  }
});

// Add custom hymn
app.post('/api/hymns', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const { number, title } = req.body;

    // Check if hymn already exists
    const existing = await pool.query(
      'SELECT id FROM custom_hymns WHERE number = $1',
      [number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Hymn number already exists' });
    }

    await pool.query(
      'INSERT INTO custom_hymns (number, title, created_by) VALUES ($1, $2, $3)',
      [number, title, req.user.id]
    );

    // Get updated hymns
    const result = await pool.query(
      'SELECT number, title FROM custom_hymns ORDER BY CAST(number AS INTEGER)'
    );

    const hymns = {};
    result.rows.forEach(row => {
      hymns[row.number] = row.title;
    });

    res.json(hymns);

    // Broadcast update
    broadcastToClients({ type: 'HYMNS_UPDATED', hymns });

  } catch (error) {
    console.error('Add hymn error:', error);
    res.status(500).json({ error: 'Failed to add hymn' });
  }
});

// Remove custom hymn
app.delete('/api/hymns/:number', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const { number } = req.params;

    await pool.query('DELETE FROM custom_hymns WHERE number = $1', [number]);

    // Get updated hymns
    const result = await pool.query(
      'SELECT number, title FROM custom_hymns ORDER BY CAST(number AS INTEGER)'
    );

    const hymns = {};
    result.rows.forEach(row => {
      hymns[row.number] = row.title;
    });

    res.json(hymns);

    // Broadcast update
    broadcastToClients({ type: 'HYMNS_UPDATED', hymns });

  } catch (error) {
    console.error('Remove hymn error:', error);
    res.status(500).json({ error: 'Failed to remove hymn' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SMART TEXT ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get smart text
app.get('/api/smart-text', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT text_key, content FROM smart_text');

    const smartText = {};
    result.rows.forEach(row => {
      smartText[row.text_key] = row.content;
    });

    res.json(smartText);
  } catch (error) {
    console.error('Get smart text error:', error);
    res.status(500).json({ error: 'Failed to get smart text' });
  }
});

// Update smart text
app.put('/api/smart-text', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const smartText = req.body;

    // Update each smart text entry
    for (const [key, content] of Object.entries(smartText)) {
      await pool.query(
        'UPDATE smart_text SET content = $1, updated_by = $2 WHERE text_key = $3',
        [content, req.user.id, key]
      );
    }

    res.json(smartText);

    // Broadcast update
    broadcastToClients({ type: 'SMART_TEXT_UPDATED', smartText });

  } catch (error) {
    console.error('Update smart text error:', error);
    res.status(500).json({ error: 'Failed to update smart text' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGENDA ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Get saved agendas list
app.get('/api/agendas', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT date, created_at FROM agendas ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get agendas error:', error);
    res.status(500).json({ error: 'Failed to get agendas' });
  }
});

// Get specific agenda
app.get('/api/agendas/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query('SELECT data FROM agendas WHERE date = $1', [date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agenda not found' });
    }

    res.json(result.rows[0].data);
  } catch (error) {
    console.error('Get agenda error:', error);
    res.status(500).json({ error: 'Failed to get agenda' });
  }
});

// Save agenda
app.post('/api/agendas', authenticateToken, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  try {
    const { date, data } = req.body;

    await pool.query(
      `INSERT INTO agendas (date, data, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (date, created_by)
       DO UPDATE SET data = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
      [date, JSON.stringify(data), req.user.id]
    );

    res.json({ success: true });

    // Broadcast update
    broadcastToClients({ type: 'AGENDA_SAVED', date, data });

  } catch (error) {
    console.error('Save agenda error:', error);
    res.status(500).json({ error: 'Failed to save agenda' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET FOR REAL-TIME UPDATES
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`🔌 WebSocket client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 WebSocket client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastToClients(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(messageStr);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for real-time updates`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await pool.end();
  process.exit(0);
});