const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

test('allows configured origins with trailing slashes and comma-separated local origins', async () => {
  const originalClientOrigin = process.env.CLIENT_ORIGIN;
  process.env.CLIENT_ORIGIN = 'https://reservas.example/,http://localhost:5500/,http://127.0.0.1:5500/';

  try {
    const app = createApp();
    for (const origin of [
      'https://reservas.example',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ]) {
      const response = await request(app)
        .options('/api/auth/register')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');

      assert.equal(response.status, 204);
      assert.equal(response.headers['access-control-allow-origin'], origin);
    }
  } finally {
    if (originalClientOrigin === undefined) {
      delete process.env.CLIENT_ORIGIN;
    } else {
      process.env.CLIENT_ORIGIN = originalClientOrigin;
    }
  }
});
