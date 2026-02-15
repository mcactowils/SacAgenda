const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result;
}

module.exports = { getPool, query };