import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

function DeleteDeck({ open, onClose, onConfirm, deckName }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete Deck</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the deck "{deckName}"? This action
          cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='primary'>
          Cancel
        </Button>
        <Button onClick={onConfirm} color='error' variant='contained'>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteDeck;
