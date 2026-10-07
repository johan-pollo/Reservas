const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const User = require('./models/user');
const Service = require('./models/service');
const Reservation = require('./models/reservation');
const { createAuthRouter, createGoogleCaptchaVerifier } = require('./routes/auth.routes');
const { createDashboardRouter } = require('./routes/dashboard.routes');
const { createUsersRouter } = require('./routes/users.routes');

function createApp({
  userModel = User,
  serviceModel = Service,
  reservationModel = Reservation,
  jwtSecret = process.env.JWT_SECRET,
  verifyCaptcha = createGoogleCaptchaVerifier(process.env.RECAPTCHA_SECRET_KEY)
} = {}) {
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
    createAuthRouter({ User: userModel, jwtSecret, verifyCaptcha })
  );
  app.use(
    '/api/dashboard',
    createDashboardRouter({
      User: userModel,
      Service: serviceModel,
      Reservation: reservationModel,
      jwtSecret
    })
  );
  app.use('/api/users', createUsersRouter({ User: userModel, jwtSecret }));

  app.use((req, res) => res.status(404).json({ message: 'Recurso no encontrado.' }));
  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ message: 'Ocurrió un error interno.' });
  });

  return app;
}

module.exports = { createApp };