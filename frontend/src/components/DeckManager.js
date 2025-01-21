import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api.js';
import {
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import DeleteDeck from './DeleteDeck';

function DeckManager() {
  const navigate = useNavigate();
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Typography variant='h4' component='h1'>
          Your Decks
        </Typography>
        <Button
          variant='contained'
          startIcon={<AddIcon />}
          onClick={() => navigate('/new')}
        >
          New Deck
        </Button>
      </Box>

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
                onClick={() => navigate(`/statistics/${deck.id}`)}
                sx={{ mr: 1, color: 'primary.main' }}
              >
                <BarChartIcon />
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
