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
import ExportDeck from './ExportDeck';
import styles from '../styles/shared.module.css';
import DownloadIcon from '@mui/icons-material/Download';
import ImportDeck from './ImportDeck';
import UploadIcon from '@mui/icons-material/Upload';

function DeckManager() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deckToExport, setDeckToExport] = useState(null);

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

  const handleExportClick = (deck) => {
    setDeckToExport(deck);
    setExportDialogOpen(true);
  };

  const handleExport = async (includeDifficulties) => {
    try {
      const [deckResponse, difficultiesResponse] = await Promise.all([
        axios.get(`/decks/${deckToExport.id}`),
        includeDifficulties
          ? axios.get(`/decks/${deckToExport.id}/difficulties`)
          : Promise.resolve({ data: [] }),
      ]);

      const { headers, data } = deckResponse.data;
      const difficulties = difficultiesResponse.data;

      let content = '';

      if (includeDifficulties) {
        content = ['difficulty - ' + headers.join(' - ')]
          .concat(
            data.map((row, index) => {
              const difficulty = difficulties[index]?.difficulty;
              const difficultyLevel = difficulty
                ? { easy: 1, normal: 2, challenging: 3, hard: 4 }[difficulty]
                : 0;
              return `${difficultyLevel} - ${headers
                .map((h) => row[h] || '')
                .join(' - ')}`;
            })
          )
          .join('\n');
      } else {
        content = [headers.join(' - ')]
          .concat(
            data.map((row) => headers.map((h) => row[h] || '').join(' - '))
          )
          .join('\n');
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckToExport.name}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportDialogOpen(false);
      setDeckToExport(null);
    } catch (error) {
      console.error('Error exporting deck:', error);
      alert('Failed to export deck');
    }
  };

  const handleImport = async (importData) => {
    try {
      // First create the deck
      const deckResponse = await axios.post('/decks', {
        name: importData.name,
        headers: importData.headers,
        data: importData.data,
      });

      // If difficulties were included, save them
      if (importData.difficulties) {
        await Promise.all(
          importData.difficulties.map((diff, index) =>
            diff.difficulty
              ? axios.post(`/decks/${deckResponse.data.id}/difficulties`, {
                  rowIndex: index,
                  difficulty: diff.difficulty,
                })
              : Promise.resolve()
          )
        );
      }

      alert('Deck imported successfully!');
      fetchDecks();
    } catch (error) {
      console.error('Error importing deck:', error);
      alert('Failed to import deck');
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Box className={styles.headerContainer}>
        <Typography variant='h5' component='h1' sx={{ mb: { xs: 1, sm: 0 } }}>
          Your Decks
        </Typography>
        <div className={styles.buttonGroup}>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => navigate('/new')}
            fullWidth={window.innerWidth < 600}
          >
            New Deck
          </Button>
          <ImportDeck onImport={handleImport} />
        </div>
      </Box>

      <List sx={{ width: '100%' }}>
        {decks.map((deck) => (
          <ListItem
            key={deck.id}
            sx={{
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 1, sm: 0 },
            }}
          >
            <ListItemText primary={deck.name} sx={{ mb: { xs: 1, sm: 0 } }} />
            <div className={styles.actionButtons}>
              <IconButton
                onClick={() => navigate(`/play/${deck.id}`)}
                sx={{ color: 'success.main' }}
              >
                <PlayArrowIcon />
              </IconButton>
              <IconButton
                onClick={() => navigate(`/statistics/${deck.id}`)}
                sx={{ color: 'primary.main' }}
              >
                <BarChartIcon />
              </IconButton>
              <IconButton
                onClick={() => navigate(`/edit/${deck.id}`)}
                sx={{ color: 'warning.main' }}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                onClick={() => handleExportClick(deck)}
                sx={{ color: 'info.main' }}
              >
                <DownloadIcon />
              </IconButton>
              <IconButton onClick={() => handleDeleteClick(deck)} color='error'>
                <DeleteIcon />
              </IconButton>
            </div>
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

      <ExportDeck
        open={exportDialogOpen}
        onClose={() => {
          setExportDialogOpen(false);
          setDeckToExport(null);
        }}
        onExport={handleExport}
        deckName={deckToExport?.name}
      />
    </div>
  );
}

export default DeckManager;
