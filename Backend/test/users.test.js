const { beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-user-management-tests';
let users;
let app;

const matchesFilter = (user, filter) => {
  if (filter.$or && !filter.$or.some((condition) =>
    Object.entries(condition).some(([field, expression]) =>
      new RegExp(expression.$regex, expression.$options).test(user[field] || '')
    )
  )) return false;

  return Object.entries(filter).every(([field, expected]) => {
    if (field === '$or') return true;
    if (expected && typeof expected === 'object' && expected.$ne) {
      return String(user[field]) !== String(expected.$ne);
    }
    return user[field] === expected;
  });
};

class FakeUserModel {
  static findById(id) {
    return {
      select: async () => {
        const user = users.find((candidate) => String(candidate._id) === String(id));
        if (!user) return null;
        user.save = async () => {};
        return user;
      }
    };
  }

  static find(filter = {}) {
    const query = {
      results: users.filter((user) => matchesFilter(user, filter)),
      sort() {
        this.results.sort((first, second) =>
          second.createdAt - first.createdAt || String(second._id).localeCompare(String(first._id))
        );
        return this;
      },
      skip(count) {
        this.results = this.results.slice(count);
        return this;
      },
      limit(count) {
        this.results = this.results.slice(0, count);
        return this;
      },
      select() {
        return this;
      },
      async lean() {
        return this.results.map((user) => ({ ...user }));
      }
    };
    return query;
  }

  static async countDocuments(filter = {}) {
    return users.filter((user) => matchesFilter(user, filter)).length;
  }

  static async exists(filter = {}) {
    return users.some((user) => matchesFilter(user, filter));
  }

  static async create(fields) {
    if (users.some((user) => user.email === fields.email)) {
      const error = new Error('duplicate email');
      error.code = 11000;
      error.keyPattern = { email: 1 };
      throw error;
    }

    const user = { _id: new mongoose.Types.ObjectId(), createdAt: new Date(), ...fields };
    users.push(user);
    return user;
  }
}

function tokenFor(user) {
  return jwt.sign({ role: user.role }, jwtSecret, {
    subject: String(user._id),
    expiresIn: '1h'
  });
}

function requestAs(user, method, path) {
  return request(app)[method](path).set('Authorization', `Bearer ${tokenFor(user)}`);
}

beforeEach(() => {
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Ana Administradora',
    email: 'ana@correo.com',
    phone: '3001234567',
    passwordHash: 'secret-hash',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z')
  };
  const secondAdmin = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Otro Administrador',
    email: 'admin2@correo.com',
    phone: '',
    passwordHash: 'secret-hash',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2026-01-02T00:00:00Z')
  };
  const regularUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Luis Usuario',
    email: 'luis@correo.com',
    phone: '3011234567',
    passwordHash: 'secret-hash',
    role: 'user',
    isActive: true,
    createdAt: new Date('2026-01-03T00:00:00Z')
  };
  users = [admin, secondAdmin, regularUser];
  app = createApp({ userModel: FakeUserModel, jwtSecret });
});

test('protege la gestión de usuarios para administradores', async () => {
  let response = await request(app).get('/api/users');
  assert.equal(response.status, 401);

  const regularUser = users.find((user) => user.role === 'user');
  response = await requestAs(regularUser, 'get', '/api/users');
  assert.equal(response.status, 403);
});

test('lista usuarios sin datos sensibles y permite buscar, filtrar y paginar', async () => {
  const admin = users[0];
  const response = await requestAs(admin, 'get', '/api/users?search=LUIS&role=user&status=active&page=1&limit=1');

  assert.equal(response.status, 200);
  assert.equal(response.body.users.length, 1);
  assert.equal(response.body.users[0].email, 'luis@correo.com');
  assert.equal('passwordHash' in response.body.users[0], false);
  assert.equal(response.body.pagination.total, 1);
  assert.equal(response.body.pagination.totalPages, 1);
});

test('rechaza parámetros de paginación y filtros inválidos', async () => {
  const admin = users[0];
  for (const query of ['?page=0', '?limit=101', '?role=owner', '?status=deleted']) {
    const response = await requestAs(admin, 'get', `/api/users${query}`);
    assert.equal(response.status, 400);
  }
});

test('crea un usuario y guarda únicamente el hash de la contraseña', async () => {
  const admin = users[0];
  const response = await requestAs(admin, 'post', '/api/users').send({
    name: '  Marta Nueva ',
    email: ' MARTA@CORREO.COM ',
    phone: '3021234567',
    password: 'ClaveSegura123!',
    role: 'user'
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.name, 'Marta Nueva');
  assert.equal(response.body.user.email, 'marta@correo.com');
  assert.equal('passwordHash' in response.body.user, false);

  const created = users.find((user) => user.email === 'marta@correo.com');
  assert.notEqual(created.passwordHash, 'ClaveSegura123!');
  assert.equal(await bcrypt.compare('ClaveSegura123!', created.passwordHash), true);
});

test('rechaza datos inválidos y un correo duplicado al crear usuarios', async () => {
  const admin = users[0];
  let response = await requestAs(admin, 'post', '/api/users').send({
    name: 'Nuevo Usuario',
    email: 'correo-invalido',
    password: 'ClaveSegura123!'
  });
  assert.equal(response.status, 400);

  response = await requestAs(admin, 'post', '/api/users').send({
    name: 'Correo Duplicado',
    email: 'ANA@CORREO.COM',
    password: 'ClaveSegura123!'
  });
  assert.equal(response.status, 409);
});

test('actualiza campos permitidos y rechaza cambios masivos o identificadores inválidos', async () => {
  const admin = users[0];
  const target = users[2];
  let response = await requestAs(admin, 'put', `/api/users/${target._id}`).send({
    name: 'Luis Actualizado',
    role: 'admin'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.name, 'Luis Actualizado');
  assert.equal(response.body.user.role, 'admin');

  response = await requestAs(admin, 'put', `/api/users/${target._id}`).send({ passwordHash: 'attacker-value' });
  assert.equal(response.status, 400);
  assert.notEqual(target.passwordHash, 'attacker-value');

  response = await requestAs(admin, 'put', '/api/users/no-es-id').send({ name: 'Nombre' });
  assert.equal(response.status, 400);
});

test('impide quitar el rol propio y desactivar el último administrador activo', async () => {
  const admin = users[0];
  let response = await requestAs(admin, 'put', `/api/users/${admin._id}`).send({ role: 'user' });
  assert.equal(response.status, 409);

  response = await requestAs(admin, 'put', `/api/users/${admin._id}`).send({ isActive: false });
  assert.equal(response.status, 409);
  assert.equal(admin.isActive, true);

  response = await requestAs(admin, 'delete', `/api/users/${admin._id}`);
  assert.equal(response.status, 409);
  assert.equal(admin.isActive, true);
});

test('desactiva usuarios sin borrar su historial y maneja objetivos inexistentes', async () => {
  const admin = users[0];
  const target = users[2];
  let response = await requestAs(admin, 'delete', `/api/users/${target._id}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.user.isActive, false);
  assert.equal(users.includes(target), true);

  response = await requestAs(admin, 'delete', `/api/users/${new mongoose.Types.ObjectId()}`);
  assert.equal(response.status, 404);

  response = await requestAs(admin, 'delete', `/api/users/${admin._id}`);
  assert.equal(response.status, 409);
});
