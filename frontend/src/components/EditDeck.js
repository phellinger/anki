import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextField, Button } from '@mui/material';
import axios from '../services/api.js';

function EditDeck() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deckName, setDeckName] = useState('');
  const [deckContent, setDeckContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDeck();
  }, [deckId]);

  const fetchDeck = async () => {
    try {
      const response = await axios.get(`/decks/${deckId}`);
      const { name, headers, data } = response.data;

      // Convert deck data back to text format
      const headerLine = headers.join(' - ');
      const dataLines = data.map((row) =>
        headers.map((header) => row[header] || '').join(' - ')
      );

      setDeckName(name);
      setDeckContent([headerLine, ...dataLines].join('\n'));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('Failed to load deck');
    }
  };

  const handleSave = async () => {
    try {
      const lines = deckContent.trim().split('\n');
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

      await axios.put(`/decks/${deckId}`, {
        name: deckName,
        headers,
        data,
      });

      alert('Deck updated successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error updating deck:', error);
      alert('Failed to update deck');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Edit Deck</h1>
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
        value={deckContent}
        onChange={(e) => setDeckContent(e.target.value)}
        placeholder='Enter deck data here (dash-separated columns)'
        rows={10}
        cols={50}
        style={{ width: '100%', marginBottom: '1rem' }}
      />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button
          variant='contained'
          onClick={handleSave}
          disabled={!deckName.trim()}
        >
          Save Changes
        </Button>
        <Button variant='outlined' onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default EditDeck;
