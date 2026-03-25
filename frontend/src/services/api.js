import axios from 'axios';

// Use relative URLs in dev with package.json "proxy" so session cookies stay same-origin.
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? '',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
