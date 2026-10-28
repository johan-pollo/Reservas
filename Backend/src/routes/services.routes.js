const express = require('express');
const mongoose = require('mongoose');
const { createAuthenticateMiddleware, requireAdmin } = require('../middleware/authenticate');

const MAX_PAGE_SIZE = 100;
const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'price',
  'durationMinutes',
  'imageUrl',
  'category',
  'status'
]);
const SERVICE_FIELDS = 'name description price durationMinutes imageUrl category status createdAt updatedAt';

function publicService(service) {
  return {
    id: String(service._id),
    name: service.name,
    description: service.description || '',
    price: service.price,
    durationMinutes: service.durationMinutes,
    imageUrl: service.imageUrl || '',
    category: service.category || '',
    status: service.status || 'active',
    createdAt: service.createdAt,
    updatedAt: service.updatedAt
  };
}

function validateService(body, { partial = false } = {}) {
  const updates = {};

  if (!partial || Object.hasOwn(body, 'name')) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) {
      return { error: 'El nombre del servicio es obligatorio y no puede superar 100 caracteres.' };
    }
    updates.name = body.name.trim();
  }

  if (!partial || Object.hasOwn(body, 'price')) {
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      return { error: 'El precio debe ser un número mayor o igual a cero.' };
    }
    updates.price = body.price;
  }

  if (!partial || Object.hasOwn(body, 'durationMinutes')) {
    if (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 1) {
      return { error: 'La duración debe ser un número entero de minutos mayor que cero.' };
    }
    updates.durationMinutes = body.durationMinutes;
  }

  for (const field of ['description', 'imageUrl', 'category']) {
    if (Object.hasOwn(body, field)) {
      if (typeof body[field] !== 'string' || body[field].length > 500) {
        return { error: `El campo ${field} debe ser texto de hasta 500 caracteres.` };
      }
      updates[field] = body[field].trim();
    } else if (!partial) {
      updates[field] = '';
    }
  }

  if (Object.hasOwn(body, 'status')) {
    if (!['active', 'inactive'].includes(body.status)) {
      return { error: 'El estado debe ser active o inactive.' };
    }
    updates.status = body.status;
  } else if (!partial) {
    updates.status = 'active';
  }

  return { updates };
}

function createServicesRouter({ Service, User, jwtSecret }) {
  const router = express.Router();
  router.use(createAuthenticateMiddleware({ User, jwtSecret }));

  router.get('/', async (req, res, next) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = req.query.status;
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({ message: 'La página debe ser positiva y el límite debe estar entre 1 y 100.' });
    }
    if (status !== undefined && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'El filtro status debe ser active o inactive.' });
    }

    const filter = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { category: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (category) filter.category = category;

    try {
      const [services, total] = await Promise.all([
        Service.find(filter)
          .select(SERVICE_FIELDS)
          .sort({ name: 1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Service.countDocuments(filter)
      ]);

      return res.status(200).json({
        services: services.map(publicService),
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

  router.use(requireAdmin);

  router.post('/', async (req, res, next) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))) {
      return res.status(400).json({ message: 'El servicio contiene campos no permitidos.' });
    }

    const { updates, error } = validateService(body);
    if (error) return res.status(400).json({ message: error });

    try {
      const service = await Service.create(updates);
      return res.status(201).json({
        message: 'Servicio creado correctamente.',
        service: publicService(service)
      });
    } catch (createError) {
      if (createError.name === 'ValidationError' || createError.name === 'CastError') {
        return res.status(400).json({ message: 'Los datos del servicio no son válidos.' });
      }
      return next(createError);
    }
  });

  router.put('/:id', async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'El identificador del servicio no es válido.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!Object.keys(body).length || Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))) {
      return res.status(400).json({ message: 'Incluye al menos un campo permitido del servicio.' });
    }

    const { updates, error } = validateService(body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    try {
      const service = await Service.findById(req.params.id).select(SERVICE_FIELDS);
      if (!service) return res.status(404).json({ message: 'No se encontró el servicio.' });

      Object.assign(service, updates);
      await service.save();

      return res.status(200).json({
        message: 'Servicio actualizado correctamente.',
        service: publicService(service)
      });
    } catch (updateError) {
      if (updateError.name === 'ValidationError' || updateError.name === 'CastError') {
        return res.status(400).json({ message: 'Los datos del servicio no son válidos.' });
      }
      return next(updateError);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'El identificador del servicio no es válido.' });
    }

    try {
      const service = await Service.findByIdAndDelete(req.params.id).select(SERVICE_FIELDS);
      if (!service) return res.status(404).json({ message: 'No se encontró el servicio.' });

      return res.status(200).json({
        message: 'Servicio eliminado correctamente.',
        service: publicService(service)
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createServicesRouter };
