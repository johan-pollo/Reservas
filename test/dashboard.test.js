const { beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-dashboard-tests';
const adminId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();
const serviceId = new mongoose.Types.ObjectId();
const admin = { _id: adminId, name: 'Administradora', role: 'admin', isActive: true };
const regularUser = { _id: userId, name: 'Usuario', role: 'user', isActive: true };
const inactiveUser = { _id: new mongoose.Types.ObjectId(), name: 'Inactivo', role: 'admin', isActive: false };

let users;
let reservations;
let app;

class FakeUserModel {
  static findById(id) {
    return {
      select: async () => users.find((user) => String(user._id) === String(id)) || null
    };
  }

  static async countDocuments() {
    return users.length;
  }
}

class FakeServiceModel {
  static async countDocuments(filter = {}) {
    return filter.status
      ? [ { status: 'active' }, { status: 'active' } ].filter((service) => service.status === filter.status).length
      : 3;
  }
}

class FakeReservationModel {
  static countDocuments(filter = {}) {
    return Promise.resolve(
      reservations.filter((reservation) =>
        Object.entries(filter).every(([key, value]) => reservation[key] === value)
      ).length
    );
  }

  static find(filter = {}) {
    const matchingReservations = reservations.filter((reservation) =>
      Object.entries(filter).every(([key, value]) => reservation[key] === value)
    );
    return {
      sort() {
        return this;
      },
      limit(count) {
        this.results = matchingReservations.slice(0, count);
        return this;
      },
      async select() {
        return this.results;
      }
    };
  }
}

function tokenFor(user) {
  return jwt.sign({ role: user.role }, jwtSecret, {
    subject: String(user._id),
    expiresIn: '1h'
  });
}

beforeEach(() => {
  users = [admin, regularUser, inactiveUser];
  reservations = [
    {
      _id: new mongoose.Types.ObjectId(),
      userId,
      serviceId,
      date: new Date('2026-11-01T00:00:00.000Z'),
      time: '10:00',
      status: 'pending',
      notes: 'Primera reserva'
    },
    {
      _id: new mongoose.Types.ObjectId(),
      userId,
      serviceId,
      date: new Date('2026-11-02T00:00:00.000Z'),
      time: '11:00',
      status: 'confirmed',
      notes: ''
    },
    {
      _id: new mongoose.Types.ObjectId(),
      userId: otherUserId,
      serviceId,
      date: new Date('2026-11-03T00:00:00.000Z'),
      time: '12:00',
      status: 'completed',
      notes: ''
    }
  ];
  app = createApp({
    userModel: FakeUserModel,
    serviceModel: FakeServiceModel,
    reservationModel: FakeReservationModel,
    jwtSecret
  });
});

test('requiere un bearer token válido para consultar el dashboard', async () => {
  let response = await request(app).get('/api/dashboard/stats');
  assert.equal(response.status, 401);

  response = await request(app)
    .get('/api/dashboard/stats')
    .set('Authorization', 'Bearer token-invalido');
  assert.equal(response.status, 401);
});

test('devuelve estadísticas globales y reservas recientes a un administrador', async () => {
  const response = await request(app)
    .get('/api/dashboard/stats')
    .set('Authorization', `Bearer ${tokenFor(admin)}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.user, {
    id: String(adminId),
    name: 'Administradora',
    role: 'admin'
  });
  assert.deepEqual(response.body.stats, {
    users: 3,
    services: { total: 3, active: 2 },
    reservations: { total: 3, pending: 1, confirmed: 1, cancelled: 0, completed: 1 }
  });
  assert.equal(response.body.recentReservations.length, 3);
});

test('limita las estadísticas y reservas del usuario a su propia cuenta', async () => {
  const response = await request(app)
    .get('/api/dashboard/stats')
    .set('Authorization', `Bearer ${tokenFor(regularUser)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.stats.users, null);
  assert.deepEqual(response.body.stats.reservations, {
    total: 2,
    pending: 1,
    confirmed: 1,
    cancelled: 0,
    completed: 0
  });
  assert.equal(response.body.recentReservations.length, 2);
  assert.ok(response.body.recentReservations.every((reservation) => reservation.userId === String(userId)));
});

test('rechaza usuarios inactivos aunque presenten un token firmado válido', async () => {
  const response = await request(app)
    .get('/api/dashboard/stats')
    .set('Authorization', `Bearer ${tokenFor(inactiveUser)}`);

  assert.equal(response.status, 401);
});
