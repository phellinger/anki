import React from 'react';
import { Typography, Box } from '@mui/material';
import { useUser } from '../contexts/UserContext';

function UserInfo() {
  const { user } = useUser();

  return (
    <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
      <Typography variant='body2'>Logged in as {user?.username}</Typography>
    </Box>
  );
}

export default UserInfo;
