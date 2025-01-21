import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

function ExportDeck({ open, onClose, onExport, deckName }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Export Deck</DialogTitle>
      <DialogContent>
        <Typography>
          Do you want to include difficulty levels in the export of "{deckName}
          "?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onExport(false)} color='primary'>
          Export Without Difficulties
        </Button>
        <Button
          onClick={() => onExport(true)}
          color='primary'
          variant='contained'
        >
          Include Difficulties
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExportDeck;
