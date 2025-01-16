import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DeckManager from './components/DeckManager';
import EditDeck from './components/EditDeck';
import PlayDeck from './components/PlayDeck';
import { Container } from '@mui/material';

function App() {
  return (
    <Router>
      <Container maxWidth='lg' sx={{ py: 4 }}>
        <Routes>
          <Route path='/' element={<DeckManager />} />
          <Route path='/edit/:deckId' element={<EditDeck />} />
          <Route path='/play/:deckId' element={<PlayDeck />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
