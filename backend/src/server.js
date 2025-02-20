const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = config.server.port || 5193;

// Middleware
app.use(
  cors({
    origin: config.server.frontendUrl,
    credentials: true,
  })
);
app.use(bodyParser.json());

// Create MySQL connection pool
const pool = mysql.createPool(config.db);

// Create tables if they don't exist
async function initializeDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

initializeDatabase();

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

// Get default user middleware
const getDefaultUser = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      ['AnkiStudent']
    );
    req.userId = users[0].id;
    next();
  } catch (error) {
    console.error('Error getting default user:', error);
    res.status(500).send('Server error');
  }
};

// Apply middleware to all routes
app.use(getDefaultUser);

// Get user info
app.get('/user', (req, res) => {
  res.json({ username: 'AnkiStudent' });
});

// Create a new deck
app.post('/decks', async (req, res) => {
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
app.get('/decks', async (req, res) => {
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
app.get('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT name, headers, data FROM decks WHERE id = ?',
      [id]
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
app.put('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, headers, data } = req.body;

    const [rows] = await pool.query(
      'UPDATE decks SET name = ?, headers = ?, data = ? WHERE id = ?',
      [name, JSON.stringify(headers), JSON.stringify(data), id]
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
app.delete('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('DELETE FROM decks WHERE id = ?', [id]);

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
app.get('/decks/:id/difficulties', async (req, res) => {
  try {
    const { id } = req.params;
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
app.post('/decks/:id/difficulties', async (req, res) => {
  try {
    const { id } = req.params;
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
app.get('/decks/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
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
app.put('/decks/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
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
app.get('/default-decks', async (req, res) => {
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

app.post('/import-default-decks', async (req, res) => {
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
