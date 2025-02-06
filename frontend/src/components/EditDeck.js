import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TextField, Button } from '@mui/material';
import axios from '../services/api.js';
import styles from '../styles/shared.module.css';
import { formatDeckContent, parseDeckContent } from '../utils/deckFormat';

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

      setDeckName(name);
      setDeckContent(formatDeckContent(headers, data));
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('Failed to load deck');
    }
  };

  const handleSave = async () => {
    try {
      const { headers, data } = parseDeckContent(deckContent);

      await axios.put(`/decks/${deckId}`, {
        name: deckName,
        headers,
        data,
      });

      alert('Deck updated successfully!');
      navigate('/');
    } catch (error) {
      if (error.message) {
        alert(error.message);
      } else {
        console.error('Error updating deck:', error);
        alert('Failed to update deck');
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.pageContainer}>
      <h1>Edit Deck</h1>
      <div className={styles.formField}>
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
        className={styles.fullWidthTextarea}
      />
      <div className={styles.buttonGroup}>
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
