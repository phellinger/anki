import React, { createContext, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { useUser } from './UserContext';
import axios from '../services/api';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { user, setUser } = useUser();
  const [mode, setMode] = React.useState(user?.theme || 'light');

  useEffect(() => {
    if (user?.theme) {
      setMode(user.theme);
    }
  }, [user]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === 'dark' ? '#121212' : '#ffffff',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
          text: {
            primary: mode === 'dark' ? '#ffffff' : '#000000',
            secondary: mode === 'dark' ? '#b3b3b3' : '#666666',
          },
        },
        components: {
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  backgroundColor: mode === 'dark' ? '#333333' : '#ffffff',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
                ...(mode === 'dark' && {
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow:
                    '0 0 10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    boxShadow:
                      '0 0 15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                  },
                }),
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);

    try {
      await axios.put('/user/theme', {
        theme: newMode,
        username: user.username,
      });
      // Update user context
      setUser((prev) => ({
        ...prev,
        theme: newMode,
      }));
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
