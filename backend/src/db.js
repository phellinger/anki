const mysql = require('mysql2/promise');
const config = require('./config');

async function createPool(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(
        `Attempting to connect to database (attempt ${i + 1}/${retries})...`
      );
      const pool = await mysql.createPool({
        host: config.db.host,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Test the connection
      await pool.query('SELECT 1');
      console.log('Successfully connected to database');
      return pool;
    } catch (error) {
      console.error(
        `Failed to connect to database (attempt ${i + 1}):`,
        error.message
      );
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error(
          'Failed to connect to database after multiple attempts'
        );
      }
    }
  }
}

module.exports = { createPool };
