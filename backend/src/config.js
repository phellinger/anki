require('dotenv').config();

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  server: {
    port: parseInt(process.env.SERVER_PORT || '5193', 10),
    frontendUrl: process.env.FRONTEND_URL,
  },
};
