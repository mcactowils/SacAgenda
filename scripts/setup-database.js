import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('your-username')) {
    console.error('❌ Please update your .env file with your actual Neon database URL');
    console.log('📝 Your .env file should look like:');
    console.log('DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to database...');
    await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database!');

    console.log('📋 Creating database schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

    // Execute the schema (split by semicolons to handle multiple statements)
    const statements = schemaSQL.split(';').filter(statement => statement.trim().length > 0);

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists')) {
          console.warn('⚠️ Warning:', error.message);
        }
      }
    }

    console.log('✅ Database schema created successfully!');

    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(userCount.rows[0].count);

    if (count === 0) {
      console.log('👤 No users found. The first user to register will become an admin.');
    } else {
      console.log(`👥 Found ${count} users in database.`);
    }

    console.log('🎉 Database setup complete!');
    console.log('🚀 You can now start your server with: npm run dev');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);

    if (error.message.includes('ENOTFOUND')) {
      console.log('🔍 This looks like a connection issue. Please check:');
      console.log('1. Your DATABASE_URL is correct');
      console.log('2. Your Neon database is running');
      console.log('3. Your internet connection');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();