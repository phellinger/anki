import React from 'react';
import { Paper, Box } from '@mui/material';
import { commonStyles } from '../../styles/muiStyles';

function PageContainer({ children }) {
  return (
    <Box sx={commonStyles.pageBox}>
      <Paper elevation={3} sx={commonStyles.contentPaper}>
        {children}
      </Paper>
    </Box>
  );
}

export default PageContainer;
