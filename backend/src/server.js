const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { createPool } = require('./db');
const fs = require('fs').promises;
const path = require('path');
const sessionService = require('./services/sessionService');
const mail = require('./services/mail');
const otpUtil = require('./services/otp');

const app = express();
const PORT = config.server.port;

const corsExtraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsAllowedOrigins = new Set(
  [
    config.server.frontendUrl,
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    'http://127.0.0.1',
    ...corsExtraOrigins,
  ].filter(Boolean)
);

function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  if (corsAllowedOrigins.has(origin)) {
    return callback(null, true);
  }
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
    return callback(null, true);
  }
  console.warn(`CORS blocked Origin: ${origin}`);
  callback(new Error('Not allowed by CORS'));
}

// Middleware
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

let pool; // Declare pool in wider scope
const userCreationLocks = new Map();

async function requireSessionUser(req, res, next) {
  try {
    const sessionId = sessionService.getSessionIdFromRequest(req);
    const userId = await sessionService.findUserIdForSession(pool, sessionId);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = userId;
    req.sessionId = sessionId;
    await sessionService.touchSession(pool, sessionId);
    next();
  } catch (error) {
    console.error('Session middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deckOwnedByUser(deckId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM decks WHERE id = ? AND user_id = ?',
    [deckId, userId]
  );
  return rows.length > 0;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

const REGISTER_OTP_COOLDOWN_MS = 60 * 1000;
const registerOtpLastSent = new Map();
const LOGIN_OTP_COOLDOWN_MS = 60 * 1000;
const loginOtpLastSent = new Map();

async function findUserByLoginIdentifier(identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) {
    const email = normalizeEmail(raw);
    const [rows] = await pool.query(
      'SELECT id, username, theme, email, email_verified_at, password_hash FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  }
  const [rows] = await pool.query(
    'SELECT id, username, theme, email, email_verified_at, password_hash FROM users WHERE username = ?',
    [raw]
  );
  return rows[0] || null;
}

// Create tables if they don't exist
async function initializeDatabase(pool) {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        theme VARCHAR(10) DEFAULT 'light',
        ip_address VARCHAR(45) DEFAULT NULL,
        INDEX idx_ip_address (ip_address)
      );
    `);

    // Create default user if not exists
    await pool.query(`
      INSERT IGNORE INTO users (username) VALUES ('AnkiStudent');
    `);

    // Create decks table with user reference
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        headers JSON,
        data JSON,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create deck_difficulties with user reference
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_difficulties (
        deck_id INT,
        user_id INT NOT NULL,
        row_index INT,
        difficulty VARCHAR(20),
        PRIMARY KEY (deck_id, row_index, user_id),
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create deck_settings with user reference
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_settings (
        deck_id INT,
        user_id INT NOT NULL,
        direction VARCHAR(20) DEFAULT 'both',
        skip_easy BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (deck_id, user_id),
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_sessions_user_id (user_id),
        INDEX idx_sessions_expires_at (expires_at)
      );
    `);

    try {
      await pool.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL');
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }

    try {
      await pool.query(
        'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL'
      );
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }

    try {
      await pool.query(
        'ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL'
      );
    } catch (e) {
      if (e.errno !== 1060) throw e;
    }

    try {
      await pool.query(
        'CREATE UNIQUE INDEX uq_users_email ON users (email)'
      );
    } catch (e) {
      if (e.errno !== 1061) throw e;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        purpose VARCHAR(32) NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        consumed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_lookup (email, user_id, purpose),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Migrate existing data to include default user
    const [defaultUser] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      ['AnkiStudent']
    );
    const userId = defaultUser[0].id;

    // Update existing decks
    await pool.query('UPDATE decks SET user_id = ? WHERE user_id IS NULL', [
      userId,
    ]);

    // Update existing difficulties
    await pool.query(
      'UPDATE deck_difficulties SET user_id = ? WHERE user_id IS NULL',
      [userId]
    );

    // Update existing settings
    await pool.query(
      'UPDATE deck_settings SET user_id = ? WHERE user_id IS NULL',
      [userId]
    );

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Start server only after database is ready
async function startServer() {
  try {
    // Create database pool with retries
    pool = await createPool(); // Assign to the outer pool variable

    // Initialize database
    await initializeDatabase(pool);

    // Start listening only after database is ready
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.status(200).send('OK');
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).send('Not OK');
  }
});

// Get user info with theme (session required)
app.get('/user', requireSessionUser, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT username, theme, email, email_verified_at FROM users WHERE id = ?',
      [req.userId]
    );
    res.json({
      username: users[0].username,
      theme: users[0].theme || 'light',
      isAnonymous: !users[0].email || !users[0].email_verified_at,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Server error');
  }
});

// Same profile shape as GET /user (alias for auth plan)
app.get('/user/me', requireSessionUser, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT username, theme, email, email_verified_at FROM users WHERE id = ?',
      [req.userId]
    );
    res.json({
      username: users[0].username,
      theme: users[0].theme || 'light',
      isAnonymous: !users[0].email || !users[0].email_verified_at,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Server error');
  }
});

// Update theme endpoint
app.put('/user/theme', requireSessionUser, async (req, res) => {
  try {
    const { theme } = req.body;

    await pool.query('UPDATE users SET theme = ? WHERE id = ?', [
      theme,
      req.userId,
    ]);

    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End session (clears cookie; client should reload so /user/identify creates a new anonymous user)
app.post('/auth/logout', async (req, res) => {
  try {
    const sessionId = sessionService.getSessionIdFromRequest(req);
    if (sessionId) {
      await sessionService.destroySession(pool, sessionId);
    }
    sessionService.clearSessionCookie(res);
    res.json({ ok: true });
  } catch (error) {
    console.error('Logout:', error);
    sessionService.clearSessionCookie(res);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// --- Sign in (email/username + OTP or password) ---

app.post('/auth/login/otp/request', async (req, res) => {
  try {
    const identifier = req.body?.identifier;
    const user = await findUserByLoginIdentifier(identifier);
    if (!user || !user.email_verified_at) {
      return res.status(400).json({
        error:
          'No verified account found for that email or username. Register first or check spelling.',
      });
    }

    const last = loginOtpLastSent.get(user.email);
    if (last && Date.now() - last < LOGIN_OTP_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'Please wait a minute before requesting another code',
      });
    }

    const code = otpUtil.randomDigits4();
    const codeHash = otpUtil.hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'DELETE FROM email_otps WHERE email = ? AND user_id = ? AND purpose = ?',
      [user.email, user.id, 'login']
    );

    await pool.query(
      `INSERT INTO email_otps (email, user_id, purpose, code_hash, expires_at)
       VALUES (?, ?, 'login', ?, ?)`,
      [user.email, user.id, codeHash, expiresAt]
    );

    loginOtpLastSent.set(user.email, Date.now());

    await mail.sendMail({
      to: user.email,
      subject: 'Your Anki Today sign-in code',
      text: `Your sign-in code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, ignore this email.`,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('login otp request:', error);
    res.status(500).json({ error: 'Could not send sign-in email' });
  }
});

app.post('/auth/login/otp/verify', async (req, res) => {
  try {
    const identifier = req.body?.identifier;
    const code = String(req.body?.code || '').trim();
    if (!identifier || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 4-digit code' });
    }

    const user = await findUserByLoginIdentifier(identifier);
    if (!user || !user.email_verified_at) {
      return res.status(400).json({ error: 'Invalid code or account' });
    }

    const [rows] = await pool.query(
      `SELECT id FROM email_otps WHERE email = ? AND user_id = ? AND purpose = 'login'
       AND consumed_at IS NULL AND expires_at > NOW() AND code_hash = ?`,
      [user.email, user.id, otpUtil.hashCode(code)]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await pool.query('UPDATE email_otps SET consumed_at = NOW() WHERE id = ?', [
      rows[0].id,
    ]);

    const oldSid = sessionService.getSessionIdFromRequest(req);
    if (oldSid) {
      await sessionService.destroySession(pool, oldSid);
    }

    const { sessionId: newSid } = await sessionService.createSession(
      pool,
      user.id
    );
    sessionService.setSessionCookie(res, newSid);

    res.json({
      username: user.username,
      theme: user.theme || 'light',
      isAnonymous: false,
      token: newSid,
    });
  } catch (error) {
    console.error('login otp verify:', error);
    res.status(500).json({ error: 'Sign-in failed' });
  }
});

app.post('/auth/login/password', async (req, res) => {
  try {
    const identifier = req.body?.identifier;
    const password = req.body?.password;
    if (!identifier || password == null || String(password).length === 0) {
      return res.status(400).json({ error: 'Password required' });
    }

    const user = await findUserByLoginIdentifier(identifier);
    if (!user || !user.password_hash) {
      return res.status(400).json({
        error:
          'Invalid email/username or password. If you never set a password, use email code instead.',
      });
    }

    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid email/username or password' });
    }

    const oldSid = sessionService.getSessionIdFromRequest(req);
    if (oldSid) {
      await sessionService.destroySession(pool, oldSid);
    }

    const { sessionId: newSid } = await sessionService.createSession(
      pool,
      user.id
    );
    sessionService.setSessionCookie(res, newSid);

    res.json({
      username: user.username,
      theme: user.theme || 'light',
      isAnonymous: false,
      token: newSid,
    });
  } catch (error) {
    console.error('login password:', error);
    res.status(500).json({ error: 'Sign-in failed' });
  }
});

// --- Registration (Phase B): email OTP + username / optional password ---

app.post('/auth/register/otp/request', requireSessionUser, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const last = registerOtpLastSent.get(email);
    if (last && Date.now() - last < REGISTER_OTP_COOLDOWN_MS) {
      return res.status(429).json({
        error: 'Please wait a minute before requesting another code',
      });
    }

    const [taken] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.userId]
    );
    if (taken.length) {
      return res
        .status(409)
        .json({ error: 'This email is already registered to another account.' });
    }

    const [self] = await pool.query(
      'SELECT email, email_verified_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (
      self[0].email &&
      self[0].email === email &&
      self[0].email_verified_at
    ) {
      return res.status(400).json({
        error: 'You are already registered with this email.',
      });
    }

    const code = otpUtil.randomDigits4();
    const codeHash = otpUtil.hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'DELETE FROM email_otps WHERE email = ? AND user_id = ? AND purpose = ?',
      [email, req.userId, 'registration']
    );

    await pool.query(
      `INSERT INTO email_otps (email, user_id, purpose, code_hash, expires_at)
       VALUES (?, ?, 'registration', ?, ?)`,
      [email, req.userId, codeHash, expiresAt]
    );

    registerOtpLastSent.set(email, Date.now());

    await mail.sendMail({
      to: email,
      subject: 'Your Anki Today verification code',
      text: `Your verification code is: ${code}\n\nIt expires in 10 minutes.`,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('register otp request:', error);
    res.status(500).json({ error: 'Could not send verification email' });
  }
});

app.post('/auth/register/otp/verify', requireSessionUser, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    if (!email || !/^\d{4}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 4-digit code' });
    }

    const [rows] = await pool.query(
      `SELECT id FROM email_otps WHERE email = ? AND user_id = ? AND purpose = 'registration'
       AND consumed_at IS NULL AND expires_at > NOW() AND code_hash = ?`,
      [email, req.userId, otpUtil.hashCode(code)]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await pool.query('UPDATE email_otps SET consumed_at = NOW() WHERE id = ?', [
      rows[0].id,
    ]);

    try {
      await pool.query(
        'UPDATE users SET email = ?, email_verified_at = NOW() WHERE id = ?',
        [email, req.userId]
      );
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res
          .status(409)
          .json({ error: 'This email is already in use.' });
      }
      throw e;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('register otp verify:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/auth/register/complete', requireSessionUser, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;

    if (!username || username.length < 1 || username.length > 64) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    const [urows] = await pool.query(
      'SELECT email_verified_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (!urows[0]?.email_verified_at) {
      return res.status(400).json({ error: 'Verify your email first' });
    }

    const [dup] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, req.userId]
    );
    if (dup.length) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    let passwordHash = null;
    if (password != null && String(password).length > 0) {
      if (String(password).length < 8) {
        return res
          .status(400)
          .json({ error: 'Password must be at least 8 characters' });
      }
      passwordHash = await bcrypt.hash(String(password), 10);
    }

    await pool.query(
      'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
      [username, passwordHash, req.userId]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('register complete:', error);
    res.status(500).json({ error: 'Could not complete registration' });
  }
});

// Create a new deck
app.post('/decks', requireSessionUser, async (req, res) => {
  try {
    const { name, headers, data } = req.body;
    const [result] = await pool.query(
      'INSERT INTO decks (user_id, name, headers, data) VALUES (?, ?, ?, ?)',
      [req.userId, name, JSON.stringify(headers), JSON.stringify(data)]
    );
    res.status(201).json({
      id: result.insertId,
      message: 'Deck saved successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving deck');
  }
});

// Get all decks for user
app.get('/decks', requireSessionUser, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM decks WHERE user_id = ?',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching decks');
  }
});

// Get a specific deck
app.get('/decks/:id', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT name, headers, data FROM decks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).send('Deck not found');
    }

    // Add error handling for JSON parsing
    let headers, data;
    try {
      // Check if headers/data are already objects
      headers =
        typeof rows[0].headers === 'string'
          ? JSON.parse(rows[0].headers)
          : rows[0].headers;

      data =
        typeof rows[0].data === 'string'
          ? JSON.parse(rows[0].data)
          : rows[0].data;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw headers:', rows[0].headers);
      console.error('Raw data:', rows[0].data);
      return res.status(500).send('Error parsing deck data');
    }

    // Ensure headers and data are arrays
    if (!Array.isArray(headers) || !Array.isArray(data)) {
      console.error('Invalid data structure:', { headers, data });
      return res.status(500).send('Invalid deck data structure');
    }

    const deck = {
      name: rows[0].name,
      headers: headers,
      data: data,
    };

    res.json(deck);
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).send('Error fetching deck');
  }
});

// Update a deck
app.put('/decks/:id', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, headers, data } = req.body;

    const [rows] = await pool.query(
      'UPDATE decks SET name = ?, headers = ?, data = ? WHERE id = ? AND user_id = ?',
      [name, JSON.stringify(headers), JSON.stringify(data), id, req.userId]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).send('Deck not found');
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).send('Error updating deck');
  }
});

// Delete a deck
app.delete('/decks/:id', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'DELETE FROM decks WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.affectedRows === 0) {
      return res.status(404).send('Deck not found');
    }

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).send('Error deleting deck');
  }
});

// Get deck difficulties
app.get('/decks/:id/difficulties', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await deckOwnedByUser(id, req.userId))) {
      return res.status(404).send('Deck not found');
    }
    const [rows] = await pool.query(
      'SELECT row_index, difficulty FROM deck_difficulties WHERE deck_id = ? AND user_id = ?',
      [id, req.userId]
    );
    const difficulties = {};
    rows.forEach((row) => {
      difficulties[row.row_index] = {
        difficulty: row.difficulty,
      };
    });
    res.json(difficulties);
  } catch (error) {
    console.error('Error fetching difficulties:', error);
    res.status(500).send('Error fetching difficulties');
  }
});

// Save difficulty
app.post('/decks/:id/difficulties', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await deckOwnedByUser(id, req.userId))) {
      return res.status(404).send('Deck not found');
    }
    const { rowIndex, difficulty } = req.body;
    await pool.query(
      'INSERT INTO deck_difficulties (deck_id, user_id, row_index, difficulty) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE difficulty = VALUES(difficulty)',
      [id, req.userId, rowIndex, difficulty]
    );
    res.json({ message: 'Difficulty saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving difficulty');
  }
});

// Get deck settings
app.get('/decks/:id/settings', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await deckOwnedByUser(id, req.userId))) {
      return res.status(404).send('Deck not found');
    }
    const [rows] = await pool.query(
      'SELECT direction, skip_easy FROM deck_settings WHERE deck_id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (rows.length === 0) {
      // Create default settings if none exist
      await pool.query(
        'INSERT INTO deck_settings (deck_id, user_id, direction, skip_easy) VALUES (?, ?, ?, ?)',
        [id, req.userId, 'both', false]
      );
      return res.json({ direction: 'both', skip_easy: false });
    }

    res.json({ direction: rows[0].direction, skip_easy: rows[0].skip_easy });
  } catch (error) {
    console.error('Error fetching deck settings:', error);
    res.status(500).send('Error fetching deck settings');
  }
});

// Update deck settings
app.put('/decks/:id/settings', requireSessionUser, async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await deckOwnedByUser(id, req.userId))) {
      return res.status(404).send('Deck not found');
    }
    const { direction, skip_easy } = req.body;

    const [result] = await pool.query(
      'INSERT INTO deck_settings (deck_id, user_id, direction, skip_easy) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE direction = VALUES(direction), skip_easy = VALUES(skip_easy)',
      [id, req.userId, direction, skip_easy]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating deck settings:', error);
    res.status(500).send('Error updating deck settings');
  }
});

// Add these new endpoints
app.get('/default-decks', requireSessionUser, async (req, res) => {
  try {
    const examplesDir = config.paths.examples;

    // Check if directory exists
    try {
      await fs.access(examplesDir);
    } catch {
      // Directory doesn't exist
      return res.json({ count: 0 });
    }

    const files = await fs.readdir(examplesDir);
    const deckFiles = files.filter((file) => file.endsWith('.txt'));
    res.json({ count: deckFiles.length });
  } catch (error) {
    console.error('Error listing default decks:', error);
    res.status(500).send('Error listing default decks');
  }
});

app.post('/import-default-decks', requireSessionUser, async (req, res) => {
  try {
    const examplesDir = config.paths.examples;

    // Check if directory exists
    try {
      await fs.access(examplesDir);
    } catch {
      return res.status(500).send('Examples directory not found');
    }

    const files = await fs.readdir(examplesDir);
    const deckFiles = files.filter((file) => file.endsWith('.txt'));

    const results = await Promise.allSettled(
      deckFiles.map(async (file) => {
        const content = await fs.readFile(path.join(examplesDir, file), 'utf8');
        const lines = content.trim().split('\n');
        const [headerLine, ...dataLines] = lines;
        const headers = headerLine.split(' - ');

        const data = dataLines.map((line) => {
          const values = line.split(' - ');
          return headers.reduce((acc, header, index) => {
            acc[header] = values[index]?.trim() || '';
            return acc;
          }, {});
        });

        const deckName = file.replace('.txt', '');

        const [result] = await pool.query(
          'INSERT INTO decks (user_id, name, headers, data) VALUES (?, ?, ?, ?)',
          [req.userId, deckName, JSON.stringify(headers), JSON.stringify(data)]
        );

        return { name: deckName, id: result.insertId };
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    res.json({
      message: `Successfully imported ${successful.length} decks`,
      successful: successful.map((s) => s.value),
      failedCount: failed.length,
    });
  } catch (error) {
    console.error('Error importing default decks:', error);
    res.status(500).send('Error importing default decks');
  }
});

// User identification: session cookie, or recover via storedUsername, or new anonymous user
app.post('/user/identify', async (req, res) => {
  const ipAddress = req.ip;
  const { storedUsername } = req.body || {};

  try {
    const sessionId = sessionService.getSessionIdFromRequest(req);
    const sessionUserId = await sessionService.findUserIdForSession(
      pool,
      sessionId
    );

    if (sessionUserId) {
      const [users] = await pool.query(
        'SELECT username, theme, email, email_verified_at FROM users WHERE id = ?',
        [sessionUserId]
      );
      if (users.length > 0) {
        await sessionService.touchSession(pool, sessionId);
        return res.json({
          username: users[0].username,
          theme: users[0].theme || 'light',
          isNew: false,
          isAnonymous:
            !users[0].email || !users[0].email_verified_at,
          token: sessionId,
        });
      }
    }

    if (storedUsername) {
      const [existingUser] = await pool.query(
        'SELECT id, username, theme, email, email_verified_at FROM users WHERE username = ?',
        [storedUsername]
      );
      if (existingUser.length > 0) {
        const { sessionId: newSid } = await sessionService.createSession(
          pool,
          existingUser[0].id
        );
        sessionService.setSessionCookie(res, newSid);
        return res.json({
          username: existingUser[0].username,
          theme: existingUser[0].theme || 'light',
          isNew: false,
          isAnonymous:
            !existingUser[0].email || !existingUser[0].email_verified_at,
          token: newSid,
        });
      }
    }

    const { generateUsername } = require('./services/usernameGenerator');
    let username;
    let user = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!user && attempts < maxAttempts) {
      try {
        username = await generateUsername();
        const [result] = await pool.query(
          'INSERT INTO users (username, ip_address) VALUES (?, ?)',
          [username, ipAddress]
        );
        user = { id: result.insertId, username };
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') {
          throw error;
        }
      }
      attempts++;
    }

    if (!user) {
      let counter = 1;
      while (!user) {
        try {
          username = `${await generateUsername()}${counter}`;
          const [result] = await pool.query(
            'INSERT INTO users (username, ip_address) VALUES (?, ?)',
            [username, ipAddress]
          );
          user = { id: result.insertId, username };
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
          counter++;
        }
      }
    }

    const { sessionId: newSid } = await sessionService.createSession(
      pool,
      user.id
    );
    sessionService.setSessionCookie(res, newSid);

    return res.json({
      username: user.username,
      theme: 'light',
      isNew: true,
      isAnonymous: true,
      token: newSid,
    });
  } catch (error) {
    console.error('Error in user identification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
