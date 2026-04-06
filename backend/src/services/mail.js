const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

/**
 * Sends email when SMTP_* is set; otherwise logs body (dev / no SMTP).
 */
async function sendMail({ to, subject, text }) {
  const from = process.env.MAIL_FROM || 'Anki Today <noreply@localhost>';
  const transport = createTransport();

  if (!transport) {
    console.warn(
      '[mail] SMTP not configured (set SMTP_HOST, etc.). Message not sent:',
      { to, subject, text }
    );
    return { sent: false, devLog: true };
  }

  await transport.sendMail({ from, to, subject, text });
  return { sent: true, devLog: false };
}

module.exports = { sendMail };
