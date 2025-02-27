import React from 'react';
import { Paper } from '@mui/material';

function PageContainer({ children }) {
  return (
    <div
      style={{
        padding: '1rem',
        maxWidth: '100%',
        boxSizing: 'border-box',
        '@media (min-width: 600px)': {
          padding: '2rem',
        },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          p: 3,
          borderRadius: 2,
          width: '100%',
        }}
      >
        {children}
      </Paper>
    </div>
  );
}

export default PageContainer;
