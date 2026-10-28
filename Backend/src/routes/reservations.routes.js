const express = require('express');
const mongoose = require('mongoose');
const { createAuthenticateMiddleware } = require('../middleware/authenticate');

const MAX_PAGE_SIZE = 100;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function publicReservation(reservation) {
  const serviceData = reservation.serviceId && typeof reservation.serviceId === 'object' && reservation.serviceId._id
    ? {
        id: String(reservation.serviceId._id),
        name: reservation.serviceId.name,
        price: reservation.serviceId.price,
        durationMinutes: reservation.serviceId.durationMinutes,
        category: reservation.serviceId.category || ''
      }
    : reservation.serviceId ? String(reservation.serviceId) : null;

  return {
    id: String(reservation._id),
    userId: reservation.userId && typeof reservation.userId === 'object' && reservation.userId._id
      ? String(reservation.userId._id)
      : String(reservation.userId),
    service: serviceData,
    serviceId: reservation.serviceId && typeof reservation.serviceId === 'object' && reservation.serviceId._id
      ? String(reservation.serviceId._id)
      : String(reservation.serviceId),
    date: reservation.date,
    time: reservation.time,
    notes: reservation.notes || '',
    status: reservation.status || 'confirmed',
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt
  };
}

function parseDateInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function createReservationsRouter({ Reservation, Service, User, jwtSecret }) {
  const router = express.Router();
  const authenticate = createAuthenticateMiddleware({ User, jwtSecret });

  router.use(authenticate);

  // POST /api/reservations (HUS-06)
  router.post('/', async (req, res, next) => {
    try {
      const { serviceId, date, time, notes } = req.body || {};

      if (!serviceId || !mongoose.isValidObjectId(serviceId)) {
        return res.status(400).json({ message: 'El identificador de servicio es obligatorio y debe ser válido.' });
      }

      if (Service) {
        const serviceExists = await Service.findById(serviceId);
        if (!serviceExists || serviceExists.status === 'inactive') {
          return res.status(404).json({ message: 'El servicio solicitado no existe o no está disponible.' });
        }
      }

      if (!date) {
        return res.status(400).json({ message: 'La fecha es obligatoria.' });
      }

      const parsedDate = parseDateInput(date);
      if (!parsedDate) {
        return res.status(400).json({ message: 'La fecha proporcionada no es válida.' });
      }

      if (!time || typeof time !== 'string' || !TIME_REGEX.test(time)) {
        return res.status(400).json({ message: 'La hora debe tener formato HH:mm válido (ej. 14:30).' });
      }

      if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
        return res.status(400).json({ message: 'Las observaciones no pueden superar 500 caracteres.' });
      }

      // Validar traslape / disponibilidad:
      // No debe existir otra reserva en la misma fecha y hora que no esté cancelada
      // Buscamos colisiones en el mismo día y hora para el mismo servicio (o recurso)
      const startOfDay = new Date(parsedDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const conflict = await Reservation.findOne({
        serviceId,
        date: { $gte: startOfDay, $lte: endOfDay },
        time,
        status: { $ne: 'cancelled' }
      });

      if (conflict) {
        return res.status(409).json({ message: 'El horario seleccionado ya no se encuentra disponible.' });
      }

      const newReservation = await Reservation.create({
        userId: req.authUser._id,
        serviceId,
        date: parsedDate,
        time,
        notes: (notes || '').trim(),
        status: 'confirmed'
      });

      const populated = await Reservation.findById(newReservation._id)
        .populate('serviceId', 'name price durationMinutes category')
        .lean();

      return res.status(201).json({
        message: 'Reserva agendada exitosamente.',
        reservation: publicReservation(populated || newReservation)
      });
    } catch (error) {
      return next(error);
    }
  });

  // GET /api/reservations (HUS-07)
  router.get('/', async (req, res, next) => {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const { status, startDate, endDate } = req.query;

      // Filtrar siempre por usuario actual a menos que sea admin consultando todos (si aplica)
      // HUS-07 especifica: "Retornar las reservas asociadas a un usuario específico / Filtrar reservas por ID del usuario obtenido desde el Token JWT"
      const filter = {};
      if (req.authUser.role !== 'admin' || req.query.my === 'true' || !req.query.all) {
        filter.userId = req.authUser._id;
      }

      if (status) {
        if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
          return res.status(400).json({ message: 'El estado especificado no es válido.' });
        }
        filter.status = status;
      }

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          const parsedStart = parseDateInput(startDate);
          if (!parsedStart) return res.status(400).json({ message: 'La fecha de inicio no es válida.' });
          parsedStart.setUTCHours(0, 0, 0, 0);
          filter.date.$gte = parsedStart;
        }
        if (endDate) {
          const parsedEnd = parseDateInput(endDate);
          if (!parsedEnd) return res.status(400).json({ message: 'La fecha final no es válida.' });
          parsedEnd.setUTCHours(23, 59, 59, 999);
          filter.date.$lte = parsedEnd;
        }
      }

      const total = await Reservation.countDocuments(filter);
      const items = await Reservation.find(filter)
        .populate('serviceId', 'name price durationMinutes category')
        .sort({ date: -1, time: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return res.status(200).json({
        reservations: items.map(publicReservation),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  // PUT /api/reservations/:id (HUS-08)
  router.put('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Identificador de reserva no válido.' });
      }

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reserva no encontrada.' });
      }

      // Verificar que pertenezca al usuario solicitante (o admin)
      if (String(reservation.userId) !== String(req.authUser._id) && req.authUser.role !== 'admin') {
        return res.status(403).json({ message: 'No tienes autorización para modificar esta reserva.' });
      }

      // Bloquear ediciones en reservas ya canceladas
      if (reservation.status === 'cancelled') {
        return res.status(400).json({ message: 'No se puede reprogramar una reserva que ya ha sido cancelada.' });
      }

      const { date, time, notes } = req.body || {};
      const newDate = date ? parseDateInput(date) : reservation.date;
      if (!newDate) {
        return res.status(400).json({ message: 'La fecha proporcionada no es válida.' });
      }

      const newTime = time || reservation.time;
      if (!TIME_REGEX.test(newTime)) {
        return res.status(400).json({ message: 'La hora debe tener formato HH:mm válido.' });
      }

      // Validar si la nueva fecha/hora choca con otra reserva existente
      const startOfDay = new Date(newDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(newDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const conflict = await Reservation.findOne({
        _id: { $ne: reservation._id },
        serviceId: reservation.serviceId,
        date: { $gte: startOfDay, $lte: endOfDay },
        time: newTime,
        status: { $ne: 'cancelled' }
      });

      if (conflict) {
        return res.status(409).json({ message: 'El nuevo horario seleccionado entra en conflicto con otra reserva.' });
      }

      reservation.date = newDate;
      reservation.time = newTime;
      if (notes !== undefined) {
        if (typeof notes !== 'string' || notes.length > 500) {
          return res.status(400).json({ message: 'Las observaciones no pueden superar 500 caracteres.' });
        }
        reservation.notes = notes.trim();
      }

      await reservation.save();

      const updated = await Reservation.findById(reservation._id)
        .populate('serviceId', 'name price durationMinutes category')
        .lean();

      return res.status(200).json({
        message: 'Reserva actualizada exitosamente.',
        reservation: publicReservation(updated || reservation)
      });
    } catch (error) {
      return next(error);
    }
  });

  // PATCH /api/reservations/:id/cancel (HUS-09)
  router.patch('/:id/cancel', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Identificador de reserva no válido.' });
      }

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reserva no encontrada.' });
      }

      // Comprobar pertenencia al usuario (o admin)
      if (String(reservation.userId) !== String(req.authUser._id) && req.authUser.role !== 'admin') {
        return res.status(403).json({ message: 'No tienes autorización para cancelar esta reserva.' });
      }

      // Si ya está cancelada
      if (reservation.status === 'cancelled') {
        return res.status(400).json({ message: 'La reserva ya se encuentra cancelada.' });
      }

      reservation.status = 'cancelled';
      await reservation.save();

      const updated = await Reservation.findById(reservation._id)
        .populate('serviceId', 'name price durationMinutes category')
        .lean();

      return res.status(200).json({
        message: 'Reserva cancelada exitosamente y horario liberado.',
        reservation: publicReservation(updated || reservation)
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createReservationsRouter };
