import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import axios from '../services/api';
import { setSessionToken, clearSessionToken } from '../services/apiAuth';

const UserContext = createContext();
const USER_STORAGE_KEY = 'user';

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    const { data } = await axios.get('/user/me');
    const userData = {
      username: data.username,
      theme: data.theme || 'light',
      isNew: false,
      isAnonymous:
        data.isAnonymous !== undefined ? data.isAnonymous : true,
    };
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const identifyUser = async () => {
      try {
        // First check localStorage
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        const storedData = storedUser ? JSON.parse(storedUser) : null;

        // Make API call with stored username if it exists
        const response = await axios.post('/user/identify', {
          storedUsername: storedData?.username,
        });

        if (response.data.token) {
          await setSessionToken(response.data.token);
        }

        const userData = {
          username: response.data.username,
          theme: response.data.theme || 'light',
          isNew: response.data.isNew,
          isAnonymous:
            response.data.isAnonymous !== undefined
              ? response.data.isAnonymous
              : true,
        };

        if (isMounted) {
          setUser(userData);
          // Only update localStorage if username changed
          if (!storedData || storedData.username !== userData.username) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
          }
        }
      } catch (error) {
        console.error('Error identifying user:', error);
        if (isMounted) {
          setError(error);
          setUser({ username: 'Anonymous', theme: 'light' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    identifyUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Add function to clear user data if needed
  const clearUserData = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const logout = useCallback(async () => {
    try {
      await axios.post('/auth/logout');
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    await clearSessionToken();
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.assign('/');
  }, []);

  if (loading) {
    return (
      <div data-testid='identify-loading' role='status'>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid='identify-error' role='alert'>
        Error loading user data
      </div>
    );
  }

  return (
    <UserContext.Provider
      value={{ user, setUser, clearUserData, refreshUser, logout }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
