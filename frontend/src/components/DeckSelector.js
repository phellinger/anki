// Deck Selector is a dropdown component that allows the user to select a deck from the ones in the database
// After selecting a deck, the user can click on the Edit Deck button to edit the deck. This loadds the content of the deck into the textfield. The Edit Deck button changes to a Save Deck button.
// When the user clicks on the Save Deck button, the content of the textfield is saved to the database. The Save Deck button changes to an Edit Deck button.

import React, { useState, useEffect } from 'react';
import { Select, Button, TextField } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';

const DeckSelector = ({ onDeckSelect, onEditDeck, onSaveDeck }) => {
  /** @type {Array<{id: string, name: string}>} */
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  useEffect(() => {
    // Fetch decks from database when component mounts
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    try {
      const response = await fetch('/api/decks');
      const data = await response.json();
      setDecks(data);
    } catch (error) {
      console.error('Error fetching decks:', error);
    }
  };

  const handleDeckChange = (event) => {
    setSelectedDeck(event.target.value);
    onDeckSelect(event.target.value);
  };

  const handleNewDeckNameChange = (event) => {
    setNewDeckName(event.target.value);
  };

  const handleEditSaveClick = async () => {
    if (isEditing) {
      onSaveDeck(selectedDeck);
      setIsEditing(false);
    } else {
      onEditDeck(selectedDeck);
      setIsEditing(true);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Select
        value={selectedDeck}
        onChange={handleDeckChange}
        displayEmpty
        sx={{ minWidth: 200 }}
      >
        <MenuItem value='' disabled>
          Select a deck
        </MenuItem>
        {decks.map((deck) => (
          <MenuItem key={deck.id} value={deck.id}>
            {deck.name}
          </MenuItem>
        ))}
      </Select>
      <TextField
        value={newDeckName}
        onChange={handleNewDeckNameChange}
        placeholder='New deck name'
        size='small'
        required
      />
      {selectedDeck && (
        <Button
          variant='contained'
          onClick={handleEditSaveClick}
          disabled={isEditing && !newDeckName.trim()}
        >
          {isEditing ? 'Save Deck' : 'Edit Deck'}
        </Button>
      )}
    </div>
  );
};

export default DeckSelector;
