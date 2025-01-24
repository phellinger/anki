import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/' // In production, use relative path
      : 'http://localhost:5193',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
