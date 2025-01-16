const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to PostgreSQL
const pool = new Pool(config.db);

// Create table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS decks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    headers TEXT[],
    data JSONB[]
  );
`);

pool.query(`
  CREATE TABLE IF NOT EXISTS deck_difficulties (
    deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    row_index INTEGER,
    difficulty VARCHAR(20),
    PRIMARY KEY (deck_id, row_index)
  );
`);

// Routes
app.post('/decks', async (req, res) => {
  try {
    const { name, headers, data } = req.body;
    const result = await pool.query(
      'INSERT INTO decks (name, headers, data) VALUES ($1, $2, $3) RETURNING id',
      [name, headers, data]
    );
    res
      .status(201)
      .json({ id: result.rows[0].id, message: 'Deck saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving deck');
  }
});

// Get all decks (only id and name)
app.get('/api/decks', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM decks');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching decks');
  }
});

// Get a specific deck
app.get('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT name, headers, data FROM decks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Deck not found');
    }

    res.json(result.rows[0]);
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

    const result = await pool.query(
      'UPDATE decks SET name = $1, headers = $2, data = $3 WHERE id = $4 RETURNING *',
      [name, headers, data, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Deck not found');
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating deck');
  }
});

// Add delete endpoint
app.delete('/decks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM decks WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
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
    const result = await pool.query(
      'SELECT row_index, difficulty FROM deck_difficulties WHERE deck_id = $1',
      [id]
    );

    // Convert to array format matching deck data indices
    const difficulties = result.rows.reduce((acc, row) => {
      acc[row.row_index] = row;
      return acc;
    }, {});

    res.json(difficulties);
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
      `INSERT INTO deck_difficulties (deck_id, row_index, difficulty)
       VALUES ($1, $2, $3)
       ON CONFLICT (deck_id, row_index) 
       DO UPDATE SET difficulty = EXCLUDED.difficulty`,
      [id, rowIndex, difficulty]
    );

    res.json({ message: 'Difficulty saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving difficulty');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
