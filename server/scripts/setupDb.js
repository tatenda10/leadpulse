require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

async function createDatabaseIfMissing() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const dbName = process.env.DB_NAME || 'leadpulse';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  } finally {
    await connection.end();
  }
}

async function applySchema() {
  const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await query(statement);
  }
}

async function seedSysadmin() {
  const username = String(process.env.SYSADMIN_USERNAME || 'sysadmin').trim().toLowerCase();
  const password = process.env.SYSADMIN_PASSWORD || 'sysadmin123';

  if (!username || password.length < 6) {
    throw new Error('Invalid SYSADMIN_USERNAME or SYSADMIN_PASSWORD');
  }

  const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
  const password_hash = await bcrypt.hash(password, 10);

  if (existing.length > 0) {
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, existing[0].id]);
    return { created: false, username };
  }

  await query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash]);
  return { created: true, username };
}

async function main() {
  try {
    await createDatabaseIfMissing();
    await applySchema();
    const seed = await seedSysadmin();
    console.log(`DB setup complete. Sysadmin ${seed.created ? 'created' : 'updated'}: ${seed.username}`);
  } catch (err) {
    console.error('DB setup failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
