const { beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-service-management-tests';
let users;
let services;
let app;

class FakeUserModel {
  static findById(id) {
    return {
      select: async () => users.find((user) => String(user._id) === String(id)) || null
    };
  }
}

class FakeServiceModel {
  static find(filter = {}) {
    let results = services.filter((service) => {
      if (filter.status && service.status !== filter.status) return false;
      if (filter.category && service.category !== filter.category) return false;
      if (filter.$or && !filter.$or.some((condition) =>
        Object.entries(condition).some(([field, expression]) =>
          new RegExp(expression.$regex, expression.$options).test(service[field] || '')
        )
      )) return false;
      return true;
    });

    const query = {
      select() {
        return this;
      },
      sort() {
        results = results.sort((first, second) => first.name.localeCompare(second.name));
        return this;
      },
      skip(count) {
        results = results.slice(count);
        return this;
      },
      limit(count) {
        results = results.slice(0, count);
        return this;
      },
      async lean() {
        return results.map((service) => ({ ...service }));
      }
    };
    return query;
  }

  static async countDocuments(filter = {}) {
    return this.find(filter).lean().then((matches) => matches.length);
  }

  static async create(fields) {
    const service = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      description: '',
      imageUrl: '',
      category: '',
      status: 'active',
      ...fields,
      async save() {
        this.updatedAt = new Date();
      }
    };
    services.push(service);
    return service;
  }

  static findById(id) {
    return {
      select: async () => {
        const service = services.find((candidate) => String(candidate._id) === String(id));
        if (!service) return null;
        service.save = async () => {
          service.updatedAt = new Date();
        };
        return service;
      }
    };
  }

}

function tokenFor(user) {
  return jwt.sign({}, jwtSecret, { subject: String(user._id), expiresIn: '1h' });
}

function requestAs(user, method, path) {
  return request(app)[method](path).set('Authorization', `Bearer ${tokenFor(user)}`);
}

beforeEach(() => {
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Ana Administradora',
    role: 'admin',
    isActive: true
  };
  const regularUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Luis Usuario',
    role: 'user',
    isActive: true
  };
  users = [admin, regularUser];
  services = [
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Corte',
      description: 'Corte clásico',
      price: 25000,
      durationMinutes: 30,
      imageUrl: '',
      category: 'Cabello',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z')
    },
    {
      _id: new mongoose.Types.ObjectId(),
      name: 'Peinado',
      description: '',
      price: 40000,
      durationMinutes: 45,
      imageUrl: '',
      category: 'Cabello',
      status: 'inactive',
      createdAt: new Date('2026-01-02T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z')
    }
  ];
  app = createApp({
    userModel: FakeUserModel,
    serviceModel: FakeServiceModel,
    jwtSecret,
    verifyCaptcha: async () => true
  });
});

test('permite listar servicios a usuarios autenticados con filtros y paginación', async () => {
  const response = await requestAs(users[1], 'get', '/api/services?search=CORTE&status=active&page=1&limit=1');

  assert.equal(response.status, 200);
  assert.equal(response.body.services.length, 1);
  assert.equal(response.body.services[0].name, 'Corte');
  assert.equal('passwordHash' in response.body.services[0], false);
  assert.deepEqual(response.body.pagination, { page: 1, limit: 1, total: 1, totalPages: 1 });
});

test('requiere sesión para listar y rol administrador para modificar servicios', async () => {
  assert.equal((await request(app).get('/api/services')).status, 401);
  assert.equal((await requestAs(users[1], 'post', '/api/services').send({
    name: 'Masaje',
    price: 50000,
    durationMinutes: 60
  })).status, 403);
});

test('crea servicios y valida los datos requeridos', async () => {
  const response = await requestAs(users[0], 'post', '/api/services').send({
    name: '  Masaje ',
    price: 50000,
    durationMinutes: 60,
    category: 'Bienestar'
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.service.name, 'Masaje');
  assert.equal(response.body.service.status, 'active');
  assert.equal(response.body.service.category, 'Bienestar');

  const invalidResponse = await requestAs(users[0], 'post', '/api/services').send({
    name: 'Inválido',
    price: -1,
    durationMinutes: 0
  });
  assert.equal(invalidResponse.status, 400);
});

test('actualiza y desactiva servicios sin romper sus referencias y responde ante identificadores inexistentes', async () => {
  const serviceId = String(services[0]._id);
  let response = await requestAs(users[0], 'put', `/api/services/${serviceId}`).send({
    price: 30000,
    status: 'inactive'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.service.price, 30000);
  assert.equal(response.body.service.status, 'inactive');

  response = await requestAs(users[0], 'delete', `/api/services/${serviceId}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Servicio desactivado correctamente.');
  assert.equal(response.body.service.status, 'inactive');
  assert.equal(services.some((service) => String(service._id) === serviceId), true);

  response = await requestAs(users[0], 'delete', `/api/services/${new mongoose.Types.ObjectId()}`);
  assert.equal(response.status, 404);

  response = await requestAs(users[0], 'put', '/api/services/not-an-id').send({ name: 'Cambio' });
  assert.equal(response.status, 400);
});
