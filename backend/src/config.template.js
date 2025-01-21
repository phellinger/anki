// Template for database configuration
module.exports = {
  db: {
    host: process.env.NODE_ENV === 'production' ? 'localhost' : 'mysql',
    user: 'your_username',
    password: 'your_password',
    database: 'decks',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  server: {
    port: 5193,
  },
  docker: {
    mysql: {
      user: 'your_username',
      password: 'your_password',
      database: 'decks',
    },
  },
};
