const config = require('../src/config');
const fs = require('fs');
const path = require('path');

const envContent = `
MYSQL_ROOT_PASSWORD=${config.docker.mysql.password}
MYSQL_DATABASE=${config.docker.mysql.database}
`.trim();

// Write to backend .env
fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);

// Write to root .env (for docker-compose)
fs.writeFileSync(path.join(__dirname, '..', '..', '.env'), envContent);

console.log('Environment files generated successfully');
