const { test } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/user');
const Service = require('../src/models/service');
const Reservation = require('../src/models/reservation');

test('asigna un modelo a cada colección existente', () => {
  assert.equal(User.collection.collectionName, 'users');
  assert.equal(Service.collection.collectionName, 'services');
  assert.equal(Reservation.collection.collectionName, 'reservations');
});

test('valida los campos obligatorios de un servicio', () => {
  const service = new Service({ name: 'Corte', price: -1, durationMinutes: 0 });
  const error = service.validateSync();

  assert.ok(error.errors.name === undefined);
  assert.ok(error.errors.price);
  assert.ok(error.errors.durationMinutes);
});

test('valida referencias y formato de hora de una reserva', () => {
  const reservation = new Reservation({ time: '25:70' });
  const error = reservation.validateSync();

  assert.ok(error.errors.userId);
  assert.ok(error.errors.serviceId);
  assert.ok(error.errors.date);
  assert.ok(error.errors.time);
});