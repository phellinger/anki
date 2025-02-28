import React from 'react';
import { Typography, Box, IconButton, Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { commonStyles } from '../styles/muiStyles';
import { useNavigate } from 'react-router-dom';

function UserInfo() {
  const { user } = useUser();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <Box sx={commonStyles.userInfo}>
      <Typography variant='body2'>
        Logged in as {user?.username} |{' '}
        <Link href='#' onClick={() => navigate('/register')}>
          Register
        </Link>
      </Typography>
      <IconButton onClick={toggleTheme} color='inherit'>
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Box>
  );
}

export default UserInfo;
