import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DeckManager from './components/DeckManager';
import DeckForm from './components/DeckForm';
import EditDeck from './components/EditDeck';
import PlayDeck from './components/PlayDeck';
import DeckStatistics from './components/DeckStatistics';
import { Container } from '@mui/material';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CssBaseline } from '@mui/material';
import Register from './components/Register';
import SignIn from './components/SignIn';

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <CssBaseline />
        <Router>
          <Container
            maxWidth={false}
            sx={{
              py: 4,
              px: { xs: 1, sm: 2, md: 3 },
              width: '100%',
              maxWidth: '1200px',
              minWidth: '400px',
              mx: 'auto',
              overflow: 'auto',
            }}
          >
            <Routes>
              <Route path='/' element={<DeckManager />} />
              <Route path='/new' element={<DeckForm />} />
              <Route path='/edit/:deckId' element={<EditDeck />} />
              <Route path='/play/:deckId' element={<PlayDeck />} />
              <Route path='/statistics/:deckId' element={<DeckStatistics />} />
              <Route path='/register' element={<Register />} />
              <Route path='/sign-in' element={<SignIn />} />
            </Routes>
          </Container>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;
