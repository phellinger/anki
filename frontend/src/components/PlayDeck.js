import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Box, ButtonGroup, Paper } from '@mui/material';
import axios from '../services/api.js';
import styles from '../styles/card.module.css';
import DirectionToggle from './DirectionToggle';
import {
  DIFFICULTIES,
  DIFFICULTY_WEIGHTS,
  DIFFICULTY_COLORS_MUI,
} from '../constants/difficulties';

function PlayDeck() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [currentRow, setCurrentRow] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLeftSide, setIsLeftSide] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [rowsWithDifficulty, setRowsWithDifficulty] = useState([]);
  const [direction, setDirection] = useState('both');

  useEffect(() => {
    fetchDeckAndSettings();
  }, [deckId]);

  const fetchDeckAndSettings = async () => {
    try {
      const [deckResponse, difficultiesResponse, settingsResponse] =
        await Promise.all([
          axios.get(`/decks/${deckId}`),
          axios.get(`/decks/${deckId}/difficulties`),
          axios.get(`/decks/${deckId}/settings`),
        ]);

      const deckData = deckResponse.data;
      const difficulties = difficultiesResponse.data;
      const settings = settingsResponse.data;

      // Combine deck data with difficulties
      const rowsWithDiff = deckData.data.map((row, index) => ({
        ...row,
        difficulty: difficulties[index]?.difficulty || 'normal',
      }));

      setDeck(deckData);
      setRowsWithDifficulty(rowsWithDiff);
      setDirection(settings.direction);
      pickNewRow(deckData, rowsWithDiff);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('Failed to load deck');
    }
  };

  const pickNewRow = (deckData, rows = rowsWithDifficulty) => {
    if (!deckData || !rows || rows.length === 0) return;

    // Calculate weighted probabilities
    const totalWeight = rows.reduce(
      (sum, row) => sum + DIFFICULTY_WEIGHTS[row.difficulty || 'unreported'],
      0
    );

    let random = Math.random() * totalWeight;
    let selectedRow;

    for (const row of rows) {
      random -= DIFFICULTY_WEIGHTS[row.difficulty || 'unreported'];
      if (random <= 0) {
        selectedRow = row;
        break;
      }
    }

    setCurrentRow(selectedRow);

    // Determine which side to show based on content
    const leftContent = selectedRow[deckData.headers[0]];
    const rightContent = selectedRow[deckData.headers[1]];

    if (!leftContent && rightContent) {
      setIsLeftSide(false);
    } else if (!rightContent && leftContent) {
      setIsLeftSide(true);
    } else {
      setIsLeftSide(Math.random() < 0.5);
    }

    setShowAnswer(false);
  };

  const handleDifficultyClick = async (difficulty) => {
    try {
      // Save difficulty to database
      await axios.post(`/decks/${deckId}/difficulties`, {
        rowIndex: rowsWithDifficulty.indexOf(currentRow),
        difficulty,
      });

      // Update local state
      const updatedRows = rowsWithDifficulty.map((row) =>
        row === currentRow ? { ...row, difficulty } : row
      );
      setRowsWithDifficulty(updatedRows);

      // Pick next card with updated difficulties
      pickNewRow(deck, updatedRows);
    } catch (error) {
      console.error('Error saving difficulty:', error);
      alert('Failed to save difficulty rating');
    }
  };

  const handleShowClick = () => {
    setShowAnswer(true);
  };

  const handleDirectionChange = async (newDirection) => {
    setDirection(newDirection);
    setShowAnswer(false); // Reset card when direction changes

    try {
      await axios.put(`/decks/${deckId}/settings`, { direction: newDirection });
    } catch (error) {
      console.error('Error saving direction:', error);
      // Continue with local state even if save fails
    }
  };

  useEffect(() => {
    if (!currentRow) return;

    // Determine which side to show based on direction
    switch (direction) {
      case 'leftToRight':
        setIsLeftSide(true);
        break;
      case 'rightToLeft':
        setIsLeftSide(false);
        break;
      case 'both':
        setIsLeftSide(Math.random() < 0.5);
        break;
      default:
        setIsLeftSide(Math.random() < 0.5);
    }
  }, [currentRow, direction]);

  if (isLoading || !currentRow) {
    return <div>Loading...</div>;
  }

  const leftSideContent = deck.headers[0];
  const rightSideContent = deck.headers[1];
  const displayedContent = isLeftSide ? leftSideContent : rightSideContent;
  const hiddenContent = isLeftSide ? rightSideContent : leftSideContent;

  return (
    <Box className={styles.cardContainer}>
      <Typography
        variant='h5'
        component='h1'
        sx={{
          textAlign: 'center',
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 'bold',
        }}
      >
        {deck.name}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          my: 1,
        }}
      >
        <Typography>{deck.headers[0]}</Typography>
        <DirectionToggle
          direction={direction}
          onDirectionChange={handleDirectionChange}
        />
        <Typography>{deck.headers[1]}</Typography>
      </Box>

      <Paper
        elevation={3}
        className={styles.card}
        sx={{
          wordBreak: 'break-word',
        }}
      >
        {currentRow && (
          <Typography variant='h5'>
            {showAnswer
              ? currentRow[hiddenContent]
              : currentRow[displayedContent]}
          </Typography>
        )}
      </Paper>

      {!showAnswer ? (
        <Button
          variant='contained'
          onClick={handleShowClick}
          size='large'
          fullWidth={window.innerWidth < 600}
        >
          Show
        </Button>
      ) : (
        <ButtonGroup
          variant='contained'
          size='large'
          orientation={window.innerWidth < 600 ? 'vertical' : 'horizontal'}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            onClick={() => handleDifficultyClick(DIFFICULTIES.EASY)}
            color={DIFFICULTY_COLORS_MUI[DIFFICULTIES.EASY]}
          >
            Easy
          </Button>
          <Button
            onClick={() => handleDifficultyClick(DIFFICULTIES.NORMAL)}
            color={DIFFICULTY_COLORS_MUI[DIFFICULTIES.NORMAL]}
          >
            Normal
          </Button>
          <Button
            onClick={() => handleDifficultyClick(DIFFICULTIES.CHALLENGING)}
            color={DIFFICULTY_COLORS_MUI[DIFFICULTIES.CHALLENGING]}
          >
            Challenging
          </Button>
          <Button
            onClick={() => handleDifficultyClick(DIFFICULTIES.HARD)}
            color={DIFFICULTY_COLORS_MUI[DIFFICULTIES.HARD]}
          >
            Hard
          </Button>
        </ButtonGroup>
      )}

      <Button
        variant='outlined'
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
        fullWidth={window.innerWidth < 600}
      >
        Back to Decks
      </Button>
    </Box>
  );
}

export default PlayDeck;
