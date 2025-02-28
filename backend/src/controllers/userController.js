const { generateUsername } = require('../services/usernameGenerator');
const pool = require('../db');

async function findOrCreateUser(req, res) {
  try {
    const ipAddress = req.ip;

    // First try to find user by stored username
    const storedUsername = req.cookies.username;
    if (storedUsername) {
      const [existingUser] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [storedUsername]
      );
      if (existingUser.length > 0) {
        return res.json({ username: existingUser[0].username, isNew: false });
      }
    }

    // Then try to find by IP
    const [existingUserByIp] = await pool.query(
      'SELECT * FROM users WHERE ip_address = ?',
      [ipAddress]
    );
    if (existingUserByIp.length > 0) {
      res.cookie('username', existingUserByIp[0].username, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      return res.json({ username: existingUserByIp[0].username, isNew: false });
    }

    // Generate new username
    let username;
    let user;
    let attempts = 0;
    const maxAttempts = 3;

    while (!user && attempts < maxAttempts) {
      username = await generateUsername();
      const [existingUser] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      if (existingUser.length === 0) {
        const [result] = await pool.query(
          'INSERT INTO users (username, ip_address) VALUES (?, ?)',
          [username, ipAddress]
        );
        user = { id: result.insertId, username };
        break;
      }
      attempts++;
    }

    // If still no unique username, add numbers
    if (!user) {
      let counter = 1;
      while (!user) {
        username = `${await generateUsername()}${counter}`;
        const [existingUser] = await pool.query(
          'SELECT * FROM users WHERE username = ?',
          [username]
        );
        if (existingUser.length === 0) {
          const [result] = await pool.query(
            'INSERT INTO users (username, ip_address) VALUES (?, ?)',
            [username, ipAddress]
          );
          user = { id: result.insertId, username };
          break;
        }
        counter++;
      }
    }

    // Set cookie
    res.cookie('username', user.username, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    return res.json({ username: user.username, isNew: true });
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { findOrCreateUser };
