import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, Button, Paper } from '@mui/material';
import axios from '../services/api.js';
import styles from '../styles/card.module.css';
import sharedStyles from '../styles/shared.module.css';

const DIFFICULTY_COLORS = {
  hard: '#d32f2f', // error.main
  challenging: '#ed6c02', // warning.main
  normal: '#0288d1', // info.main
  easy: '#2e7d32', // success.main
  unreported: '#9e9e9e', // grey[500]
};

function DeckStatistics() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [difficulties, setDifficulties] = useState({
    hard: 0,
    challenging: 0,
    normal: 0,
    easy: 0,
    unreported: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

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
      const difficultyData = difficultiesResponse.data;

      // Count difficulties
      const counts = {
        hard: 0,
        challenging: 0,
        normal: 0,
        easy: 0,
        unreported: 0,
      };

      deckData.data.forEach((_, index) => {
        const difficulty = difficultyData[index]?.difficulty;
        if (difficulty) {
          counts[difficulty]++;
        } else {
          counts.unreported++;
        }
      });

      setDeck(deckData);
      setDifficulties(counts);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load deck statistics');
    }
  };

  if (isLoading || !deck) {
    return <div>Loading...</div>;
  }

  const maxCount = Math.max(...Object.values(difficulties));

  return (
    <div className={styles.cardContainer}>
      <Typography variant='h4' component='h1'>
        {deck.name}
      </Typography>

      <Paper elevation={3} className={styles.statisticsCard}>
        {Object.entries(difficulties).map(([difficulty, count]) => (
          <Box key={difficulty} className={styles.statisticsBar}>
            <Box
              className={styles.barContent}
              sx={{
                bgcolor: DIFFICULTY_COLORS[difficulty],
                height: `${(count / maxCount) * 250}px`,
              }}
            />
            <Typography variant='body2' sx={{ mt: 1 }}>
              {count}
            </Typography>
            <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
              {difficulty}
            </Typography>
          </Box>
        ))}
      </Paper>

      <Typography variant='body1'>Total Cards: {deck.data.length}</Typography>

      <Button variant='outlined' onClick={() => navigate('/')}>
        Back to Decks
      </Button>
    </div>
  );
}

export default DeckStatistics;