import React, { useRef } from 'react';
import { Button } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';

function ImportDeck({ onImport }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('File must contain at least headers and one data row');
      }

      const [headerLine, ...dataLines] = lines;
      const headers = headerLine.split(' - ');

      // Check if the first header is 'difficulty' to determine format
      const hasDifficulties = headers[0].toLowerCase() === 'difficulty';
      const actualHeaders = hasDifficulties ? headers.slice(1) : headers;

      const data = dataLines.map((line) => {
        const values = line.split(' - ');
        if (hasDifficulties) {
          const [difficultyLevel, ...rowValues] = values;
          return {
            difficulty: parseInt(difficultyLevel),
            data: actualHeaders.reduce((acc, header, index) => {
              acc[header] = rowValues[index]?.trim() || '';
              return acc;
            }, {}),
          };
        } else {
          return {
            data: headers.reduce((acc, header, index) => {
              acc[header] = values[index]?.trim() || '';
              return acc;
            }, {}),
          };
        }
      });

      // Use the file name without extension as the deck name
      const deckName = file.name.replace(/\.[^/.]+$/, '');

      onImport({
        name: deckName,
        headers: actualHeaders,
        data: data.map((item) => item.data),
        difficulties: hasDifficulties
          ? data.map((item) => ({
              difficulty: {
                0: null,
                1: 'easy',
                2: 'normal',
                3: 'challenging',
                4: 'hard',
              }[item.difficulty],
            }))
          : null,
      });

      // Reset the file input
      event.target.value = '';
    } catch (error) {
      console.error('Error parsing file:', error);
      alert(
        'Failed to parse deck file. Please make sure the format is correct.'
      );
    }
  };

  return (
    <>
      <input
        type='file'
        ref={fileInputRef}
        accept='.txt'
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        variant='contained'
        startIcon={<UploadIcon />}
        onClick={handleClick}
        sx={{ ml: 1 }}
      >
        Import&nbsp;Deck
      </Button>
    </>
  );
}

export default ImportDeck;
