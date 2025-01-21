import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DeckManager from './components/DeckManager';
import DeckForm from './components/DeckForm';
import EditDeck from './components/EditDeck';
import PlayDeck from './components/PlayDeck';
import DeckStatistics from './components/DeckStatistics';
import { Container } from '@mui/material';

function App() {
  return (
    <Router>
      <Container maxWidth='lg' sx={{ py: 4 }}>
        <Routes>
          <Route path='/' element={<DeckManager />} />
          <Route path='/new' element={<DeckForm />} />
          <Route path='/edit/:deckId' element={<EditDeck />} />
          <Route path='/play/:deckId' element={<PlayDeck />} />
          <Route path='/statistics/:deckId' element={<DeckStatistics />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
