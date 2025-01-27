const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = config.server.port;

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

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).send('Error updating deck');
  }
});

// Add delete endpoint
app.delete('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('DELETE FROM decks WHERE id = ?', [id]);

    if (rows.affectedRows === 0) {
      return res.status(404).send('Deck not found');
    }

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting deck');
  }
});

// Add new endpoints
app.get('/decks/:id/difficulties', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT row_index, difficulty FROM deck_difficulties WHERE deck_id = ?',
      [id]
    );

    // Convert to array format matching deck data indices
    const difficulties = {};
    rows.forEach((row) => {
      difficulties[row.row_index] = {
        difficulty: row.difficulty,
      };
    });

    res.json(difficulties); // Return as an object with indices as keys
  } catch (error) {
    console.error(error);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
