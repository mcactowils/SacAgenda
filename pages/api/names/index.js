const { query } = require('../../../lib/db');
const { authenticateRequest, requireRole } = require('../../../lib/auth');

export default async function handler(req, res) {
  try {
    const authResult = await authenticateRequest(req);
    if (authResult.error) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    if (req.method === 'GET') {
      // Get all name groups
      const result = await query(
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

    } else if (req.method === 'POST') {
      // Add name to group
      const roleCheck = requireRole(['ADMIN', 'EDITOR'])(authResult.user);
      if (roleCheck) {
        return res.status(roleCheck.status).json({ error: roleCheck.error });
      }

      const { category, name } = req.body;

      if (!['presiding', 'conducting', 'chorister', 'organist'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      // Check if name already exists in category
      const existing = await query(
        'SELECT id FROM name_groups WHERE category = $1 AND name = $2',
        [category, name]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Name already exists in this category' });
      }

      await query(
        'INSERT INTO name_groups (category, name, created_by) VALUES ($1, $2, $3)',
        [category, name, authResult.user.id]
      );

      // Get updated name groups
      const result = await query(
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

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Names API error:', error);
    res.status(500).json({ error: 'Failed to process names request' });
  }
}