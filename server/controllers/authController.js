const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  return user;
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const usernameNorm = String(username).trim().toLowerCase();
    const rows = await query(
      'SELECT id, username, password_hash, created_at, updated_at FROM users WHERE username = ?',
      [usernameNorm]
    );
    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = sanitizeUser(row);
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { login };
