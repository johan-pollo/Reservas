const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { createAuthenticateMiddleware, requireAdmin } = require('../middleware/authenticate');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const ALLOWED_ROLES = ['admin', 'user'];
const MAX_PAGE_SIZE = 100;
const USER_FIELDS = 'name email phone role isActive createdAt';

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name || '',
    email: user.email,
    phone: user.phone || '',
    role: user.role || 'user',
    isActive: user.isActive !== false,
    createdAt: user.createdAt
  };
}

function validateProfile(body, { partial = false } = {}) {
  const updates = {};

  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
      return { error: 'El nombre debe tener entre 2 y 100 caracteres.' };
    }
    updates.name = body.name.trim();
  }

  if (!partial || Object.hasOwn(body, 'email')) {
    if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email.trim())) {
      return { error: 'Ingresa un correo electrónico válido.' };
    }
    updates.email = body.email.trim().toLowerCase();
  }

  if (!partial || Object.hasOwn(body, 'phone')) {
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    if (phone && (!/^\+?[0-9\s().-]{7,30}$/.test(phone) || (phone.match(/\d/g) || []).length < 7)) {
      return { error: 'Ingresa un teléfono válido de hasta 30 caracteres.' };
    }
    updates.phone = phone;
  }

  if (!partial || Object.hasOwn(body, 'role')) {
    const role = partial && !Object.hasOwn(body, 'role') ? undefined : body.role;
    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return { error: 'El rol debe ser admin o user.' };
    }
    if (role !== undefined) updates.role = role;
    else if (!partial) updates.role = 'user';
  }

  if (Object.hasOwn(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'El estado isActive debe ser verdadero o falso.' };
    }
    updates.isActive = body.isActive;
  } else if (!partial) {
    updates.isActive = true;
  }

  return { updates };
}

function createUsersRouter({ User, jwtSecret }) {
  const router = express.Router();
  router.use(createAuthenticateMiddleware({ User, jwtSecret }), requireAdmin);

  router.get('/', async (req, res, next) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const role = req.query.role;
    const status = req.query.status;

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({ message: 'La página debe ser positiva y el límite debe estar entre 1 y 100.' });
    }
    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'El filtro role debe ser admin o user.' });
    }
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'El filtro status debe ser active o inactive.' });
    }

    const filter = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';

    try {
      const [users, total] = await Promise.all([
        User.find(filter)
          .select(USER_FIELDS)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      return res.status(200).json({
        users: users.map(publicUser),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { updates, error } = validateProfile(body);
    const password = typeof body.password === 'string' ? body.password : '';

    if (error) return res.status(400).json({ message: error });
    if (!STRONG_PASSWORD_PATTERN.test(password) || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo, y no superar 72 bytes.'
      });
    }

    try {
      if (await User.exists({ email: updates.email })) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
      }

      const user = await User.create({
        ...updates,
        passwordHash: await bcrypt.hash(password, 12)
      });

      return res.status(201).json({
        message: 'Usuario creado correctamente.',
        user: publicUser(user)
      });
    } catch (createError) {
      if (createError.code === 11000 && createError.keyPattern?.email) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
      }
      return next(createError);
    }
  });

  router.put('/:id', async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'El identificador del usuario no es válido.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const allowedFields = new Set(['name', 'email', 'phone', 'role', 'isActive']);
    if (!Object.keys(body).length || Object.keys(body).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({ message: 'Incluye al menos un campo permitido: name, email, phone, role o isActive.' });
    }

    const { updates, error } = validateProfile(body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    try {
      const user = await User.findById(req.params.id).select(USER_FIELDS);
      if (!user) return res.status(404).json({ message: 'No se encontró el usuario.' });

      const affectsOwnAccess = String(user._id) === String(req.authUser._id) &&
        ((updates.role !== undefined && updates.role !== 'admin') || updates.isActive === false);
      if (affectsOwnAccess) {
        return res.status(409).json({ message: 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.' });
      }

      const removesActiveAdmin = user.role === 'admin' && user.isActive !== false &&
        ((updates.role !== undefined && updates.role !== 'admin') || updates.isActive === false);
      if (removesActiveAdmin && await User.countDocuments({ role: 'admin', isActive: true }) <= 1) {
        return res.status(409).json({ message: 'No se puede desactivar ni cambiar el rol del último administrador activo.' });
      }

      if (updates.email && updates.email !== user.email && await User.exists({
        email: updates.email,
        _id: { $ne: user._id }
      })) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
      }

      Object.assign(user, updates);
      await user.save();

      return res.status(200).json({
        message: 'Usuario actualizado correctamente.',
        user: publicUser(user)
      });
    } catch (updateError) {
      if (updateError.code === 11000 && updateError.keyPattern?.email) {
        return res.status(409).json({ message: 'Ya existe un usuario con ese correo electrónico.' });
      }
      return next(updateError);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'El identificador del usuario no es válido.' });
    }
    if (String(req.params.id) === String(req.authUser._id)) {
      return res.status(409).json({ message: 'No puedes desactivar tu propia cuenta.' });
    }

    try {
      const user = await User.findById(req.params.id).select(USER_FIELDS);
      if (!user) return res.status(404).json({ message: 'No se encontró el usuario.' });

      if (user.role === 'admin' && user.isActive !== false &&
        await User.countDocuments({ role: 'admin', isActive: true }) <= 1) {
        return res.status(409).json({ message: 'No se puede desactivar el último administrador activo.' });
      }

      user.isActive = false;
      await user.save();

      return res.status(200).json({
        message: 'Usuario desactivado correctamente.',
        user: publicUser(user)
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createUsersRouter };
