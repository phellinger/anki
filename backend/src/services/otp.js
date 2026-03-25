const crypto = require('crypto');

function pepper() {
  return process.env.OTP_PEPPER || 'change-me-in-production';
}

function hashCode(code) {
  return crypto
    .createHash('sha256')
    .update(pepper() + ':' + String(code).trim())
    .digest('hex');
}

/** 4-digit string 0000–9999 */
function randomDigits4() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

module.exports = { hashCode, randomDigits4 };
