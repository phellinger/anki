import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5193',
});

export default api;
