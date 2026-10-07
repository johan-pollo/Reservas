const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

function createAuthenticateMiddleware({ User, jwtSecret }) {
  return async function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return res.status(401).json({ message: 'Debes iniciar sesión para acceder a este recurso.' });
    }

    let payload;
    try {
      payload = jwt.verify(match[1], jwtSecret);
    } catch {
      return res.status(401).json({ message: 'La sesión no es válida o ha expirado.' });
    }

    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return res.status(401).json({ message: 'La sesión no es válida o ha expirado.' });
    }

    try {
      const user = await User.findById(payload.sub).select('name role isActive');
      if (!user || user.isActive === false) {
        return res.status(401).json({ message: 'La sesión no es válida o ha expirado.' });
      }

      req.authUser = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { createAuthenticateMiddleware };
