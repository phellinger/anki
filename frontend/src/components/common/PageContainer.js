import React from 'react';
import { Paper, Box } from '@mui/material';
import { commonStyles } from '../../styles/muiStyles';

function PageContainer({ children, ...rest }) {
  return (
    <Box sx={commonStyles.pageBox} {...rest}>
      <Paper elevation={3} sx={commonStyles.contentPaper}>
        {children}
      </Paper>
    </Box>
  );
}

export default PageContainer;
