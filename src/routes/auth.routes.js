const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function createGoogleCaptchaVerifier(secretKey, fetchImpl = fetch) {
  return async function verifyCaptcha(token, remoteIp) {
    if (!secretKey) {
      const error = new Error('La verificación CAPTCHA no está configurada.');
      error.code = 'CAPTCHA_NOT_CONFIGURED';
      throw error;
    }

    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) body.set('remoteip', remoteIp);

    const response = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`El servicio CAPTCHA respondió con HTTP ${response.status}.`);
    }

    const result = await response.json();
    return result.success === true;
  };
}

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

function createRegisterHandler({ User, verifyCaptcha }) {
  return async function register(req, res, next) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
    const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: 'Ingresa un nombre de entre 2 y 100 caracteres.' });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
    }

    if (!/^\+?[0-9\s().-]{7,30}$/.test(phone) || (phone.match(/\d/g) || []).length < 7) {
      return res.status(400).json({ message: 'Ingresa un teléfono válido de hasta 30 caracteres.' });
    }

    if (!STRONG_PASSWORD_PATTERN.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.'
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'La contraseña no puede superar los 72 bytes.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Las contraseñas no coinciden.' });
    }

    if (body.termsAccepted !== true) {
      return res.status(400).json({ message: 'Debes aceptar los términos y condiciones.' });
    }

    if (!captchaToken) {
      return res.status(400).json({ message: 'Completa la verificación CAPTCHA.' });
    }

    try {
      const captchaIsValid = await verifyCaptcha(captchaToken, req.ip);
      if (!captchaIsValid) {
        return res.status(400).json({ message: 'La verificación CAPTCHA no es válida.' });
      }

      if (await User.exists({ email })) {
        return res.status(409).json({ message: 'Ya existe una cuenta con ese correo electrónico.' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, phone, passwordHash });

      return res.status(201).json({
        message: 'Registro exitoso. Ya puedes iniciar sesión.',
        user: {
          id: user.id || String(user._id),
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role || 'user'
        }
      });
    } catch (error) {
      if (error.code === 'CAPTCHA_NOT_CONFIGURED') {
        return res.status(503).json({ message: 'El registro no está disponible temporalmente.' });
      }

      if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ message: 'Ya existe una cuenta con ese correo electrónico.' });
      }

      return next(error);
    }
  };
}

function createAuthRouter({ User, jwtSecret, verifyCaptcha }) {
  const router = express.Router();
  router.post('/login', createLoginHandler({ User, jwtSecret }));
  router.post('/register', createRegisterHandler({ User, verifyCaptcha }));
  return router;
}

module.exports = { createAuthRouter, createGoogleCaptchaVerifier };