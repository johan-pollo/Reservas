const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createLoginHandler({ User, jwtSecret }) {
  return async function login(req, res, next) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!EMAIL_PATTERN.test(email) || !password) {
      return res.status(400).json({ message: 'Ingresa un correo válido y tu contraseña.' });
    }

    try {
      const user = await User.findOne({ email }).select('+passwordHash');
      const invalidCredentials = () =>
        res.status(401).json({ message: 'El correo o la contraseña son incorrectos.' });

      if (!user || user.isActive === false || !user.passwordHash) {
        return invalidCredentials();
      }

      if (user.lockUntil && user.lockUntil > new Date()) {
        return invalidCredentials();
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        const maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;

        if (user.failedLoginAttempts >= maxAttempts) {
          const lockMinutes = Number(process.env.LOGIN_LOCK_MINUTES) || 15;
          user.lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
        }

        await user.save();
        return invalidCredentials();
      }

      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();

      const token = jwt.sign(
        { email: user.email, role: user.role || 'user' },
        jwtSecret,
        { subject: user.id || String(user._id), expiresIn: '1h' }
      );

      return res.status(200).json({
        message: 'Inicio de sesión exitoso.',
        token,
        user: {
          id: user.id || String(user._id),
          name: user.name || '',
          email: user.email,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      return next(error);
    }
  };
}

function createAuthRouter({ User, jwtSecret }) {
  const router = express.Router();
  router.post('/login', createLoginHandler({ User, jwtSecret }));
  return router;
}

module.exports = { createAuthRouter };
