const test = require('node:test');
const assert = require('node:assert/strict');
const ReservationsApi = require('../api.js');

test('ReservationsApi expone todos los métodos para las 4 HUS de reservas', () => {
    assert.equal(typeof ReservationsApi.createReservation, 'function', 'HUS-06 createReservation debe existir');
    assert.equal(typeof ReservationsApi.getReservations, 'function', 'HUS-07 getReservations debe existir');
    assert.equal(typeof ReservationsApi.updateReservation, 'function', 'HUS-08 updateReservation debe existir');
    assert.equal(typeof ReservationsApi.cancelReservation, 'function', 'HUS-09 cancelReservation debe existir');
    assert.equal(typeof ReservationsApi.getServices, 'function', 'getServices debe existir');
    assert.equal(typeof ReservationsApi.getDashboardStats, 'function', 'getDashboardStats debe existir');
});

test('ReservationsApi maneja errores de conexión limpiamente sin lanzar excepciones no controladas', async () => {
    // Al apuntar a un host/puerto inalcanzable, debe devolver un objeto estructurado { ok: false, status: 0 }
    const originalBase = globalThis.API_BASE_URL;
    globalThis.API_BASE_URL = 'http://127.0.0.1:59999';

    try {
        const result = await ReservationsApi.getReservations();
        assert.equal(result.ok, false);
        assert.equal(result.status, 0);
        assert.ok(result.message.includes('conexión'));
    } finally {
        globalThis.API_BASE_URL = originalBase;
    }
});

test('ReservationsApi envía headers y body correctos al crear reserva (HUS-06)', async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = '';
    let interceptedOptions = {};

    globalThis.fetch = async (url, options) => {
        interceptedUrl = url;
        interceptedOptions = options;
        return {
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
                message: 'Reserva agendada exitosamente.',
                reservation: { id: 'res-123', status: 'confirmed' }
            })
        };
    };

    try {
        const payload = {
            serviceId: '65f1a2b3c4d5e6f7a8b9c0d1',
            date: '2026-11-15',
            time: '10:30',
            notes: 'Corte y peinado'
        };

        const response = await ReservationsApi.createReservation(payload);
        assert.equal(response.ok, true);
        assert.equal(response.status, 201);
        assert.ok(interceptedUrl.endsWith('/api/reservations'));
        assert.equal(interceptedOptions.method, 'POST');
        assert.equal(interceptedOptions.headers['Content-Type'], 'application/json');

        const parsedBody = JSON.parse(interceptedOptions.body);
        assert.equal(parsedBody.serviceId, payload.serviceId);
        assert.equal(parsedBody.date, payload.date);
        assert.equal(parsedBody.time, payload.time);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('ReservationsApi procesa correctamente respuesta 409 Conflict por traslape', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async () => ({
        ok: false,
        status: 409,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
            message: 'El horario seleccionado ya no se encuentra disponible.'
        })
    });

    try {
        const res = await ReservationsApi.createReservation({
            serviceId: '65f1a2b3c4d5e6f7a8b9c0d1',
            date: '2026-11-15',
            time: '10:30'
        });

        assert.equal(res.ok, false);
        assert.equal(res.status, 409);
        assert.equal(res.message, 'El horario seleccionado ya no se encuentra disponible.');
    } finally {
        globalThis.fetch = originalFetch;
    }
});
