const { afterEach, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createGoogleCaptchaVerifier } = require('../src/routes/auth.routes');

const jwtSecret = 'a-test-secret-that-is-long-enough-for-our-auth-tests';
let user;
let app;

class FakeUserModel {
  static users = [];

  static findOne({ email }) {
    return {
      select: async () => {
        const storedUser = this.users.find((candidate) => candidate.email === email);
        if (!storedUser) return null;

        return {
          ...storedUser,
          async save() {
            Object.assign(storedUser, this);
          }
        };
      }
    };
  }

  static async exists({ email }) {
    return this.users.some((candidate) => candidate.email === email);
  }

  static async create(fields) {
    const createdUser = { id: 'registered-user-123', role: 'user', ...fields };
    this.users.push(createdUser);
    return createdUser;
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
  FakeUserModel.users = [user];
  app = createApp({
    userModel: FakeUserModel,
    jwtSecret,
    verifyCaptcha: async (token) => token === 'valid-captcha-token'
  });
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

test('registra al usuario con correo normalizado y contraseña protegida', async () => {
  const response = await request(app).post('/api/auth/register').send({
    name: '  Ana Pérez ',
    email: ' ANA@CORREO.COM ',
    phone: ' 3001234567 ',
    password: 'ClaveSegura123!',
    confirmPassword: 'ClaveSegura123!',
    termsAccepted: true,
    captchaToken: 'valid-captcha-token'
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.message, 'Registro exitoso. Ya puedes iniciar sesión.');
  assert.deepEqual(response.body.user, {
    id: 'registered-user-123',
    name: 'Ana Pérez',
    email: 'ana@correo.com',
    phone: '3001234567',
    role: 'user'
  });
  assert.equal('token' in response.body, false);
  assert.equal('passwordHash' in response.body.user, false);

  const registeredUser = FakeUserModel.users.find((candidate) => candidate.email === 'ana@correo.com');
  assert.notEqual(registeredUser.passwordHash, 'ClaveSegura123!');
  assert.equal(await bcrypt.compare('ClaveSegura123!', registeredUser.passwordHash), true);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ana@correo.com', password: 'ClaveSegura123!' });
  assert.equal(loginResponse.status, 200);
});

test('rechaza campos inválidos, contraseña débil, confirmación distinta y términos no aceptados', async () => {
  const validRegistration = {
    name: 'Ana Pérez',
    email: 'ana@correo.com',
    phone: '3001234567',
    password: 'ClaveSegura123!',
    confirmPassword: 'ClaveSegura123!',
    termsAccepted: true,
    captchaToken: 'valid-captcha-token'
  };
  const invalidCases = [
    [{ ...validRegistration, email: 'correo-invalido' }, /correo electrónico válido/i],
    [{ ...validRegistration, phone: '' }, /teléfono/i],
    [{ ...validRegistration, phone: 'solo letras' }, /teléfono válido/i],
    [{ ...validRegistration, password: 'debil', confirmPassword: 'debil' }, /contraseña debe tener/i],
    [{ ...validRegistration, confirmPassword: 'OtraClave123!' }, /no coinciden/i],
    [{ ...validRegistration, termsAccepted: false }, /términos y condiciones/i]
  ];

  for (const [body, message] of invalidCases) {
    const response = await request(app).post('/api/auth/register').send(body);
    assert.equal(response.status, 400);
    assert.match(response.body.message, message);
  }

  assert.equal(FakeUserModel.users.length, 1);
});

test('rechaza correos duplicados y CAPTCHA inválidos', async () => {
  const registration = {
    name: 'Ana Pérez',
    email: ' USUARIO@CORREO.COM ',
    phone: '3001234567',
    password: 'ClaveSegura123!',
    confirmPassword: 'ClaveSegura123!',
    termsAccepted: true,
    captchaToken: 'valid-captcha-token'
  };

  let response = await request(app).post('/api/auth/register').send(registration);
  assert.equal(response.status, 409);
  assert.match(response.body.message, /ya existe/i);

  response = await request(app)
    .post('/api/auth/register')
    .send({ ...registration, email: 'ana@correo.com', captchaToken: 'invalid-captcha-token' });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /CAPTCHA/i);
  assert.equal(FakeUserModel.users.length, 1);
});

test('informa cuando reCAPTCHA no está configurado', async () => {
  const unconfiguredApp = createApp({
    userModel: FakeUserModel,
    jwtSecret,
    verifyCaptcha: createGoogleCaptchaVerifier('')
  });
  const response = await request(unconfiguredApp).post('/api/auth/register').send({
    name: 'Ana Pérez',
    email: 'ana@correo.com',
    phone: '3001234567',
    password: 'ClaveSegura123!',
    confirmPassword: 'ClaveSegura123!',
    termsAccepted: true,
    captchaToken: 'valid-captcha-token'
  });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /no está disponible/i);
  assert.equal(FakeUserModel.users.length, 1);
});

test('verifica el token reCAPTCHA con el servicio de Google', async () => {
  let verificationRequest;
  const verifyCaptcha = createGoogleCaptchaVerifier(
    'server-secret',
    async (url, options) => {
      verificationRequest = { url, options };
      return { ok: true, json: async () => ({ success: true }) };
    }
  );

  assert.equal(await verifyCaptcha('captcha-token', '127.0.0.1'), true);
  assert.equal(verificationRequest.url, 'https://www.google.com/recaptcha/api/siteverify');
  assert.equal(verificationRequest.options.method, 'POST');
  assert.equal(
    verificationRequest.options.body.toString(),
    'secret=server-secret&response=captcha-token&remoteip=127.0.0.1'
  );
});