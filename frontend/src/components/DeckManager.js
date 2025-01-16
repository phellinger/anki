import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api.js';
import {
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteDeck from './DeleteDeck';

function DeckManager() {
  const navigate = useNavigate();
  const [newDeckText, setNewDeckText] = useState('');
  const [deckName, setDeckName] = useState('');
  const [decks, setDecks] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState(null);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await axios.get('/api/decks');
      setDecks(response.data);
    } catch (error) {
      console.error('Error fetching decks:', error);
    }
  };

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
      const response = await axios.post('/decks', {
        name: deckName,
        headers,
        data,
      });
      alert('Deck added successfully!');
      setNewDeckText('');
      setDeckName('');
      navigate(`/edit/${response.data.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to add deck.');
    }
  };

  const handleDeleteClick = (deck) => {
    setDeckToDelete(deck);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/decks/${deckToDelete.id}`);
      setDeleteDialogOpen(false);
      setDeckToDelete(null);
      fetchDecks();
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Failed to delete deck');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Deck Manager</h1>
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
      </div>
      <List>
        {decks.map((deck) => (
          <ListItem key={deck.id}>
            <ListItemText primary={deck.name} />
            <ListItemSecondaryAction>
              <IconButton
                edge='end'
                onClick={() => navigate(`/play/${deck.id}`)}
                sx={{ mr: 1, color: 'success.main' }}
              >
                <PlayArrowIcon />
              </IconButton>
              <IconButton
                edge='end'
                onClick={() => navigate(`/edit/${deck.id}`)}
                sx={{ mr: 1, color: 'warning.main' }}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                edge='end'
                onClick={() => handleDeleteClick(deck)}
                color='error'
              >
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <DeleteDeck
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeckToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        deckName={deckToDelete?.name}
      />
    </div>
  );
}

export default DeckManager;
