const { afterEach, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-our-auth-tests';
let user;
let app;

class FakeUserModel {
  static findOne({ email }) {
    return {
      select: async () => {
        if (user?.email !== email) return null;

        const storedUser = user;
        return {
          ...storedUser,
          async save() {
            Object.assign(storedUser, this);
          }
        };
      }
    };
  }
}

beforeEach(async () => {
  user = {
    id: 'user-123',
    name: 'Usuario de prueba',
    email: 'usuario@correo.com',
    passwordHash: await bcrypt.hash('ClaveSegura123!', 4),
    role: 'admin',
    isActive: true,
    failedLoginAttempts: 0,
    lockUntil: null
  };
  app = createApp({ userModel: FakeUserModel, jwtSecret });
});

afterEach(() => {
  delete process.env.LOGIN_MAX_ATTEMPTS;
  delete process.env.LOGIN_LOCK_MINUTES;
});

test('rechaza datos incompletos o correo inválido antes de consultar usuario', async () => {
  const response = await request(app).post('/api/auth/login').send({ email: 'no-es-correo' });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /correo válido/i);
});

test('autentica, emite JWT y devuelve el perfil sin la contraseña', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: ' USUARIO@CORREO.COM ', password: 'ClaveSegura123!' });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Inicio de sesión exitoso.');
  assert.deepEqual(response.body.user, {
    id: 'user-123',
    name: 'Usuario de prueba',
    email: 'usuario@correo.com',
    role: 'admin'
  });
  assert.equal(jwt.verify(response.body.token, jwtSecret).sub, 'user-123');
  assert.equal('passwordHash' in response.body.user, false);
});

test('usa el mismo error ante contraseña incorrecta y bloquea al quinto intento', async () => {
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario@correo.com', password: 'incorrecta' });
  }

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'El correo o la contraseña son incorrectos.');
  assert.equal(user.failedLoginAttempts, 5);
  assert.ok(user.lockUntil instanceof Date);

  response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'usuario@correo.com', password: 'ClaveSegura123!' });
  assert.equal(response.status, 401);
});