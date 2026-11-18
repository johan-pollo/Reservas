const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadComponent(scriptName, fetchImpl, location, localStorage) {
    let component;
    const scriptPath = path.join(__dirname, '..', scriptName);
    const context = {
        Vue: {
            createApp: (definition) => ({
                mount: () => {
                    component = definition;
                }
            })
        },
        window: { API_BASE_URL: 'http://localhost:3000', location },
        localStorage,
        fetch: fetchImpl,
        console
    };

    vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), context, { filename: scriptName });
    return component;
}

test('login guarda el JWT y redirige al dashboard', async () => {
    const storedValues = {};
    let destination = '';
    const component = loadComponent(
        'login.js',
        async () => ({
            ok: true,
            status: 200,
            json: async () => ({ token: 'login-token' })
        }),
        { replace: (url) => { destination = url; } },
        { setItem: (key, value) => { storedValues[key] = value; } }
    );

    await component.methods.handleLogin.call({
        validateForm: () => true,
        email: 'cliente@example.com',
        password: 'ClaveSegura123!',
        isSubmitting: false,
        loginSuccess: '',
        loginError: ''
    });

    assert.equal(storedValues.token, 'login-token');
    assert.equal(destination, './dashboard.html');
});

test('registro guarda el JWT y redirige al dashboard con notificación de bienvenida', async () => {
    const storedValues = {};
    let destination = '';
    const component = loadComponent(
        'register.js',
        async () => ({
            ok: true,
            status: 201,
            json: async () => ({ token: 'register-token' })
        }),
        { replace: (url) => { destination = url; } },
        { setItem: (key, value) => { storedValues[key] = value; } }
    );

    await component.methods.handleRegister.call({
        validateForm: () => true,
        name: 'Cliente',
        email: 'cliente@example.com',
        phone: '3001234567',
        password: 'ClaveSegura123!',
        passwordConfirmation: 'ClaveSegura123!',
        termsAccepted: true,
        captchaToken: 'captcha-token',
        isSubmitting: false,
        registerError: ''
    });

    assert.equal(storedValues.token, 'register-token');
    assert.equal(destination, './dashboard.html?registered=1');
});
