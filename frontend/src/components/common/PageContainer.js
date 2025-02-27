import React from 'react';
import { Paper, Box } from '@mui/material';

function PageContainer({ children }) {
  return (
    <Box
      sx={{
        padding: { xs: '1rem', sm: '2rem' },
        maxWidth: '100%',
        boxSizing: 'border-box',
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
    </Box>
  );
}

export default PageContainer;
