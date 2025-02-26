const mysql = require('mysql2/promise');
const config = require('./config');

async function createPool(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const pool = mysql.createPool(config.db);
      // Test the connection
      await pool.query('SELECT 1');
      console.log('Database connection established successfully');
      return pool;
    } catch (error) {
      console.error(
        `Failed to connect to database (attempt ${i + 1}/${retries}):`,
        error.message
      );
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error('Failed to connect to database after multiple attempts');
}

module.exports = { createPool };
