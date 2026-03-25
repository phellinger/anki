const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'sid';
const SESSION_DAYS = 30;

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

async function createSession(pool, userId) {
  const id = generateSessionId();
  const expiresAt = sessionExpiresAt();
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
    [id, userId, expiresAt]
  );
  return { sessionId: id, expiresAt };
}

async function findUserIdForSession(pool, sessionId) {
  if (!sessionId) return null;
  const [rows] = await pool.query(
    'SELECT user_id FROM sessions WHERE id = ? AND expires_at > NOW()',
    [sessionId]
  );
  return rows.length ? rows[0].user_id : null;
}

async function touchSession(pool, sessionId) {
  await pool.query('UPDATE sessions SET expires_at = ? WHERE id = ?', [
    sessionExpiresAt(),
    sessionId,
  ]);
}

async function destroySession(pool, sessionId) {
  if (!sessionId) return;
  await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

module.exports = {
  SESSION_COOKIE_NAME,
  createSession,
  findUserIdForSession,
  touchSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
};
