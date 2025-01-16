const config = require('../src/config');
const fs = require('fs');
const path = require('path');

const envContent = `
POSTGRES_USER=${config.docker.postgres.user}
POSTGRES_PASSWORD=${config.docker.postgres.password}
POSTGRES_DB=${config.docker.postgres.database}
`.trim();

// Write to backend .env
fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);

// Write to root .env (for docker-compose)
fs.writeFileSync(path.join(__dirname, '..', '..', '.env'), envContent);

console.log('Environment files generated successfully');
