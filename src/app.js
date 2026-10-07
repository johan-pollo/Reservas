const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const User = require('./models/user');
const { createAuthRouter } = require('./routes/auth.routes');

function createApp({ userModel = User, jwtSecret = process.env.JWT_SECRET } = {}) {
  const app = express();
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map((origin) => origin.trim());

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Demasiados intentos. Intenta de nuevo más tarde.' }
    }),
    createAuthRouter({ User: userModel, jwtSecret })
  );

  app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: 'Ocurrió un error interno.' });
  });

  return app;
}

module.exports = { createApp };