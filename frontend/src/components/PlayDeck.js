import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Box, ButtonGroup, Paper } from '@mui/material';
import axios from '../services/api.js';
import styles from '../styles/card.module.css';

const DIFFICULTY_WEIGHTS = {
  hard: 4,
  challenging: 3,
  normal: 2,
  easy: 1,
  unreported: 5,
};

function PlayDeck() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [currentRow, setCurrentRow] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLeftSide, setIsLeftSide] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [rowsWithDifficulty, setRowsWithDifficulty] = useState([]);

  useEffect(() => {
    fetchDeckAndDifficulties();
  }, [deckId]);

  const fetchDeckAndDifficulties = async () => {
    try {
      const [deckResponse, difficultiesResponse] = await Promise.all([
        axios.get(`/decks/${deckId}`),
        axios.get(`/decks/${deckId}/difficulties`),
      ]);

      const deckData = deckResponse.data;
      const difficulties = difficultiesResponse.data;

      // Combine deck data with difficulties
      const rowsWithDiff = deckData.data.map((row, index) => ({
        ...row,
        difficulty: difficulties[index]?.difficulty || 'normal',
      }));

      setDeck(deckData);
      setRowsWithDifficulty(rowsWithDiff);
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
        }}
      >
        {deck.name}
      </Typography>

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
          <Button onClick={() => handleDifficultyClick('hard')} color='error'>
            Hard
          </Button>
          <Button
            onClick={() => handleDifficultyClick('challenging')}
            color='warning'
          >
            Challenging
          </Button>
          <Button onClick={() => handleDifficultyClick('normal')} color='info'>
            Normal
          </Button>
          <Button onClick={() => handleDifficultyClick('easy')} color='success'>
            Easy
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
