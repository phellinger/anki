import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../services/api';

const UserContext = createContext();
const USER_STORAGE_KEY = 'user';

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        const userData = {
          username: response.data.username,
          theme: response.data.theme || 'light',
          isNew: response.data.isNew,
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading user data</div>;
  }

  return (
    <UserContext.Provider value={{ user, setUser, clearUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
