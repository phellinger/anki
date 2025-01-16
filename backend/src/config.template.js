// Template for database configuration
module.exports = {
  db: {
    user: 'your_username',
    host: 'postgres',
    database: 'decks',
    password: 'your_password',
    port: 5455,
  },
  server: {
    port: 5193,
  },
  docker: {
    postgres: {
      user: 'your_username',
      password: 'your_password',
      database: 'decks',
    },
  },
};
