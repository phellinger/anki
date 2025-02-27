import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Typography,
  Box,
  ButtonGroup,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import axios from '../services/api.js';
import styles from '../styles/card.module.css';
import DirectionToggle from './DirectionToggle';
import {
  DIFFICULTIES,
  DIFFICULTY_WEIGHTS,
  DIFFICULTY_COLORS_MUI,
} from '../constants/difficulties';
import UserInfo from './UserInfo';

function PlayDeck() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [currentRow, setCurrentRow] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLeftSide, setIsLeftSide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rowsWithDifficulty, setRowsWithDifficulty] = useState([]);
  const [direction, setDirection] = useState('both');
  const [skipEasy, setSkipEasy] = useState(false);

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
      setSkipEasy(!!settings.skip_easy);

      // Remove the initial side setting and pickNewRow call from here
      // Let pickNewRow handle everything
      pickNewRow(deckData, rowsWithDiff, settings.skip_easy);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching deck:', error);
      alert('Failed to load deck');
    }
  };

  // Move side selection logic to a separate function
  const determineCardSide = (selectedRow, currentDirection, headers) => {
    // First check if one side is empty
    const leftContent = selectedRow[headers[0]];
    const rightContent = selectedRow[headers[1]];

    if (!leftContent && rightContent) {
      return false; // Show right side
    }
    if (!rightContent && leftContent) {
      return true; // Show left side
    }

    // If both sides have content, use direction setting
    switch (currentDirection) {
      case 'leftToRight':
        return true;
      case 'rightToLeft':
        return false;
      case 'both':
      default:
        return Math.random() < 0.5;
    }
  };

  const pickNewRow = (
    deckData,
    rows = rowsWithDifficulty,
    skipEasyCards = skipEasy
  ) => {
    if (!deckData || !rows || rows.length === 0) return;

    // Filter out easy cards if skipEasyCards is true
    const availableRows = skipEasyCards
      ? rows.filter((row) => row.difficulty !== DIFFICULTIES.EASY)
      : rows;

    if (availableRows.length === 0) {
      alert('No cards available with current settings');
      return;
    }

    // Calculate weighted probabilities
    const totalWeight = availableRows.reduce(
      (sum, row) => sum + DIFFICULTY_WEIGHTS[row.difficulty || 'unreported'],
      0
    );

    let random = Math.random() * totalWeight;
    let selectedRow;

    for (const row of availableRows) {
      random -= DIFFICULTY_WEIGHTS[row.difficulty || 'unreported'];
      if (random <= 0) {
        selectedRow = row;
        break;
      }
    }

    // Set both the row and side in one update
    setCurrentRow(selectedRow);
    setIsLeftSide(determineCardSide(selectedRow, direction, deckData.headers));
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

  const handleSkipEasyChange = async (event) => {
    const newSkipEasy = event.target.checked;
    setSkipEasy(newSkipEasy);

    try {
      await axios.put(`/decks/${deckId}/settings`, {
        direction,
        skip_easy: newSkipEasy,
      });
      pickNewRow(deck, rowsWithDifficulty, newSkipEasy);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Continue with local state even if save fails
    }
  };

  if (isLoading || !deck || !currentRow || isLeftSide === null) {
    return (
      <Box
        className={styles.cardContainer}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const leftSideContent = deck.headers[0];
  const rightSideContent = deck.headers[1];
  const displayedContent = isLeftSide ? leftSideContent : rightSideContent;
  const hiddenContent = isLeftSide ? rightSideContent : leftSideContent;

  return (
    <Box className={styles.cardContainer}>
      <UserInfo />
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
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography>{deck.headers[0]}</Typography>
          <DirectionToggle
            direction={direction}
            onDirectionChange={handleDirectionChange}
          />
          <Typography>{deck.headers[1]}</Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={!!skipEasy}
              onChange={handleSkipEasyChange}
              color='primary'
              size='small'
            />
          }
          label={<Typography variant='body1'>Skip easy cards</Typography>}
        />
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
