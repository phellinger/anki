const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');

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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        headers JSON,
        data JSON
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_difficulties (
        deck_id INT,
        row_index INT,
        difficulty VARCHAR(20),
        PRIMARY KEY (deck_id, row_index),
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_settings (
        deck_id INT PRIMARY KEY,
        direction VARCHAR(20) DEFAULT 'both',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );
    `);

    // Add skip_easy column if it doesn't exist
    await pool
      .query(
        `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deck_settings' 
      AND COLUMN_NAME = 'skip_easy'
    `
      )
      .then(async ([result]) => {
        if (result[0].count === 0) {
          await pool.query(`
          ALTER TABLE deck_settings
          ADD COLUMN skip_easy BOOLEAN DEFAULT false
        `);
        }
      });

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.post('/decks', async (req, res) => {
  try {
    const { name, headers, data } = req.body;
    const [result] = await pool.query(
      'INSERT INTO decks (name, headers, data) VALUES (?, ?, ?)',
      [name, JSON.stringify(headers), JSON.stringify(data)]
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

// Get all decks (only id and name)
app.get('/decks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM decks');
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
      'SELECT row_index, difficulty FROM deck_difficulties WHERE deck_id = ?',
      [id]
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

app.post('/decks/:id/difficulties', async (req, res) => {
  try {
    const { id } = req.params;
    const { rowIndex, difficulty } = req.body;

    await pool.query(
      'INSERT INTO deck_difficulties (deck_id, row_index, difficulty) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE difficulty = VALUES(difficulty)',
      [id, rowIndex, difficulty]
    );

    res.json({ message: 'Difficulty saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving difficulty');
  }
});

// Add new routes for deck settings
app.get('/decks/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT direction, skip_easy FROM deck_settings WHERE deck_id = ?',
      [id]
    );

    if (rows.length === 0) {
      // Create default settings if none exist
      await pool.query(
        'INSERT INTO deck_settings (deck_id, direction, skip_easy) VALUES (?, ?, ?)',
        [id, 'both', false]
      );
      return res.json({ direction: 'both', skip_easy: false });
    }

    res.json({ direction: rows[0].direction, skip_easy: rows[0].skip_easy });
  } catch (error) {
    console.error('Error fetching deck settings:', error);
    res.status(500).send('Error fetching deck settings');
  }
});

app.put('/decks/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { direction, skip_easy } = req.body;

    const [result] = await pool.query(
      'INSERT INTO deck_settings (deck_id, direction, skip_easy) VALUES (?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE direction = VALUES(direction), skip_easy = VALUES(skip_easy)',
      [id, direction, skip_easy]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating deck settings:', error);
    res.status(500).send('Error updating deck settings');
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
