const { beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-reservations-tests';
const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const serviceId = new mongoose.Types.ObjectId();
const regularUser = { _id: userId, name: 'Usuario Prueba', role: 'user', isActive: true };
const otherUser = { _id: otherUserId, name: 'Otro Usuario', role: 'user', isActive: true };

let users;
let services;
let reservations;
let app;

class FakeUserModel {
  static findById(id) {
    return {
      select: async () => users.find((user) => String(user._id) === String(id)) || null
    };
  }
}

class FakeServiceModel {
  static async findById(id) {
    return services.find((service) => String(service._id) === String(id)) || null;
  }
}

class FakeReservationModel {
  static async create(data) {
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      status: data.status || 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    reservations.push(doc);
    return doc;
  }

  static async findOne(filter = {}) {
    return reservations.find((r) => {
      if (filter._id && filter._id.$ne && String(r._id) === String(filter._id.$ne)) return false;
      if (filter.serviceId && String(r.serviceId) !== String(filter.serviceId)) return false;
      if (filter.time && r.time !== filter.time) return false;
      if (filter.status && filter.status.$ne && r.status === filter.status.$ne) return false;
      if (filter.date && filter.date.$gte && filter.date.$lte) {
        const rDate = new Date(r.date);
        if (rDate < filter.date.$gte || rDate > filter.date.$lte) return false;
      }
      return true;
    }) || null;
  }

  static findById(id) {
    const found = reservations.find((r) => String(r._id) === String(id));
    if (!found) {
      return {
        populate() { return this; },
        async lean() { return null; }
      };
    }

    const doc = {
      ...found,
      async save() {
        const idx = reservations.findIndex((r) => String(r._id) === String(id));
        if (idx !== -1) {
          reservations[idx] = { ...this };
        }
        return this;
      }
    };

    doc.populate = function () {
      return this;
    };
    doc.lean = async function () {
      return { ...this };
    };

    return doc;
  }

  static find(filter = {}) {
    let matches = reservations.filter((r) => {
      if (filter.userId && String(r.userId) !== String(filter.userId)) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });

    return {
      populate() { return this; },
      sort() { return this; },
      skip(count) {
        matches = matches.slice(count);
        return this;
      },
      limit(count) {
        matches = matches.slice(0, count);
        return this;
      },
      async lean() {
        return matches.map((m) => ({ ...m }));
      }
    };
  }

  static async countDocuments(filter = {}) {
    return reservations.filter((r) => {
      if (filter.userId && String(r.userId) !== String(filter.userId)) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    }).length;
  }
}

function tokenFor(user) {
  return jwt.sign({ role: user.role }, jwtSecret, {
    subject: String(user._id),
    expiresIn: '1h'
  });
}

beforeEach(() => {
  users = [regularUser, otherUser];
  services = [
    { _id: serviceId, name: 'Corte de Cabello', price: 25000, durationMinutes: 45, status: 'active' }
  ];
  reservations = [
    {
      _id: new mongoose.Types.ObjectId(),
      userId,
      serviceId,
      date: new Date('2026-11-10T10:00:00.000Z'),
      time: '10:00',
      status: 'confirmed',
      notes: 'Reserva previa'
    }
  ];

  app = createApp({
    userModel: FakeUserModel,
    serviceModel: FakeServiceModel,
    reservationModel: FakeReservationModel,
    jwtSecret
  });
});

test('HUS-06: agenda una reserva y valida disponibilidad evitando traslapes (409 Conflict)', async () => {
  // 1. Conflicto por traslape en misma fecha y hora
  const conflictRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
    .send({
      serviceId: String(serviceId),
      date: '2026-11-10',
      time: '10:00'
    });
  assert.equal(conflictRes.status, 409);
  assert.match(conflictRes.body.message, /no se encuentra disponible/i);

  // 2. Reserva exitosa en nuevo horario
  const successRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
    .send({
      serviceId: String(serviceId),
      date: '2026-11-10',
      time: '11:00',
      notes: 'Sin traslape'
    });
  assert.equal(successRes.status, 201);
  assert.equal(successRes.body.reservation.status, 'confirmed');
  assert.equal(successRes.body.reservation.time, '11:00');
});

test('HUS-07: lista reservas asociadas al usuario autenticado con filtros', async () => {
  const res = await request(app)
    .get('/api/reservations')
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.reservations));
  assert.equal(res.body.reservations.length, 1);
  assert.equal(res.body.reservations[0].userId, String(userId));
});

test('HUS-08: permite modificar la reserva re-validando disponibilidad', async () => {
  const current = reservations[0];

  const updateRes = await request(app)
    .put(`/api/reservations/${current._id}`)
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
    .send({
      date: '2026-11-10',
      time: '15:00',
      notes: 'Nueva hora reprogramada'
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.reservation.time, '15:00');
});

test('HUS-09: cancela una reserva y libera el horario', async () => {
  const current = reservations[0];

  const cancelRes = await request(app)
    .patch(`/api/reservations/${current._id}/cancel`)
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.body.reservation.status, 'cancelled');

  // Ahora el horario '10:00' debe estar libre nuevamente para agendar
  const rebookRes = await request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`)
    .send({
      serviceId: String(serviceId),
      date: '2026-11-10',
      time: '10:00'
    });

  assert.equal(rebookRes.status, 201);
});
