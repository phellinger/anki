import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api.js';
import { TextField, Button } from '@mui/material';

function DeckForm() {
  const navigate = useNavigate();
  const [newDeckText, setNewDeckText] = useState('');
  const [deckName, setDeckName] = useState('');

  const handleAddDeck = async () => {
    if (!deckName.trim()) {
      alert('Please provide a deck name');
      return;
    }

    const lines = newDeckText.trim().split('\n');
    if (lines.length < 2) {
      alert(
        'Please provide at least two lines: one for headers and one for data.'
      );
      return;
    }

    const [headerLine, ...rows] = lines;
    const headers = headerLine.split(' - ');
    const data = rows.map((row) => {
      const values = row.split('-');
      return headers.reduce((acc, header, index) => {
        acc[header] = values[index]?.trim() || '';
        return acc;
      }, {});
    });

    try {
      await axios.post('/decks', {
        name: deckName,
        headers,
        data,
      });
      alert('Deck added successfully!');
      navigate('/');
    } catch (error) {
      console.error(error);
      alert('Failed to add deck.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Create New Deck</h1>
      <div style={{ marginBottom: '1rem' }}>
        <TextField
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder='Enter deck name'
          required
          fullWidth
          size='small'
        />
      </div>
      <textarea
        value={newDeckText}
        onChange={(e) => setNewDeckText(e.target.value)}
        placeholder='Enter deck data here (dash-separated columns)'
        rows={10}
        cols={50}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button
          variant='contained'
          onClick={handleAddDeck}
          disabled={!deckName.trim()}
        >
          Add Deck
        </Button>
        <Button variant='outlined' onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default DeckForm;
