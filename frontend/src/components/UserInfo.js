import React from 'react';
import { Typography, Box, IconButton, Link } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { commonStyles } from '../styles/muiStyles';
import { Link as RouterLink } from 'react-router-dom';
import { isHashRouterBuild } from '../goToPath';

const headerLinkSx = {
  verticalAlign: 'baseline',
  cursor: 'pointer',
  font: 'inherit',
  color: 'inherit',
  textDecoration: 'underline',
  border: 0,
  background: 'none',
  padding: 0,
};

function UserInfo() {
  const { user, logout } = useUser();
  const { mode, toggleTheme } = useTheme();

  return (
    <Box sx={commonStyles.userInfo}>
      <Typography variant='body2' component='span' sx={{ lineHeight: 1.6 }}>
        Logged in as {user?.username}
        {' · '}
        <Link
          component='button'
          type='button'
          onClick={() => logout()}
          sx={headerLinkSx}
        >
          Log out
        </Link>
        {' · '}
        {isHashRouterBuild() ? (
          <Link
            href='#/sign-in'
            aria-label='Header sign-in'
            color='inherit'
            underline='always'
            sx={headerLinkSx}
          >
            Sign in
          </Link>
        ) : (
          <Link
            component={RouterLink}
            to='/sign-in'
            aria-label='Header sign-in'
            color='inherit'
            underline='always'
            sx={headerLinkSx}
          >
            Sign in
          </Link>
        )}
        {' · '}
        {isHashRouterBuild() ? (
          <Link
            href='#/register'
            color='inherit'
            underline='always'
            sx={headerLinkSx}
          >
            Register
          </Link>
        ) : (
          <Link
            component={RouterLink}
            to='/register'
            color='inherit'
            underline='always'
            sx={headerLinkSx}
          >
            Register
          </Link>
        )}
      </Typography>
      <IconButton onClick={toggleTheme} color='inherit'>
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Box>
  );
}

export default UserInfo;
