const { createApp } = Vue;
const API_BASE_URL = "http://localhost:3000";

const Login = {
    data() {
        return {
            email: "",
            password: "",
            showPassword: false,
            isSubmitting: false,
            errors: {
                email: "",
                password: ""
            },
            loginError: "",
            loginSuccess: new URLSearchParams(window.location.search).get("registered") === "1"
                ? "Tu cuenta se creó correctamente. Ya puedes iniciar sesión."
                : ""
        };
    },
    template: `
        <main class="login-page">
            <section class="login-card" aria-labelledby="login-title">
                <header class="brand">
                    <div class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6M8 10h.01M16 10h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <span class="brand-name">Sistema de Reservas</span>
                </header>

                <div class="intro">
                    <p class="eyebrow">Bienvenido de nuevo</p>
                    <h1 id="login-title">Inicia sesión</h1>
                    <p class="subtitle">Ingresa tus datos para continuar al sistema.</p>
                </div>

                <form class="login-form" novalidate @submit.prevent="handleLogin">
                    <div class="form-group">
                        <label for="email">Correo electrónico</label>
                        <input
                            id="email"
                            ref="emailInput"
                            v-model="email"
                            type="email"
                            name="email"
                            autocomplete="email"
                            placeholder="nombre@correo.com"
                            :aria-invalid="Boolean(errors.email)"
                            :aria-describedby="errors.email ? 'email-error' : null"
                            @input="onEmailInput"
                        >
                        <p v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</p>
                    </div>

                    <div class="form-group">
                        <label for="password">Contraseña</label>
                        <div class="password-field">
                            <input
                                id="password"
                                ref="passwordInput"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                name="password"
                                autocomplete="current-password"
                                placeholder="Ingresa tu contraseña"
                                :aria-invalid="Boolean(errors.password)"
                                :aria-describedby="errors.password ? 'password-error' : null"
                                @input="onPasswordInput"
                            >
                            <button
                                class="password-toggle"
                                type="button"
                                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                                :aria-pressed="showPassword"
                                @click="showPassword = !showPassword"
                            >
                                <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.7"/>
                                </svg>
                                <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.5M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.4 6 9.5 6c1.1 0 2.1-.2 3-.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <p v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</p>
                    </div>

                    <p v-if="loginError" class="login-error" role="alert">{{ loginError }}</p>
                    <p v-if="loginSuccess" class="login-success" role="status">{{ loginSuccess }}</p>

                    <button class="login-button" type="submit" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
                        {{ isSubmitting ? 'Ingresando...' : 'Iniciar sesión' }}
                    </button>
                </form>

                <p class="register-prompt">
                    ¿No tienes cuenta? <a href="./register.html">Crear cuenta</a>
                </p>

                <footer class="login-footer">
                    <span class="footer-dot" aria-hidden="true"></span>
                    Acceso seguro a tu sistema de reservas
                </footer>
            </section>
        </main>
    `,
    methods: {
        clearMessages() {
            this.errors.email = "";
            this.errors.password = "";
            this.loginError = "";
            this.loginSuccess = "";
        },
        onEmailInput() {
            this.errors.email = "";
            this.loginError = "";
            this.loginSuccess = "";
        },
        onPasswordInput() {
            this.errors.password = "";
            this.loginError = "";
            this.loginSuccess = "";
        },
        validateForm() {
            this.clearMessages();

            const email = this.email.trim();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                this.errors.email = "El correo electrónico es obligatorio.";
            } else if (!emailPattern.test(email)) {
                this.errors.email = "Ingresa un correo electrónico válido.";
            }

            if (!this.password) {
                this.errors.password = "La contraseña es obligatoria.";
            }

            return !this.errors.email && !this.errors.password;
        },
        async handleLogin() {
            if (!this.validateForm()) {
                if (this.errors.email) {
                    this.$refs.emailInput.focus();
                } else {
                    this.$refs.passwordInput.focus();
                }
                return;
            }

            this.isSubmitting = true;
            this.loginSuccess = "";

            let response;
            try {
                response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        email: this.email.trim(),
                        password: this.password
                    })
                });
            } catch {
                this.loginError = "No se pudo conectar con el servicio. Inténtalo de nuevo.";
                this.isSubmitting = false;
                return;
            }

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (response.status === 401 || response.status === 403) {
                this.loginError = "El correo o la contraseña son incorrectos.";
                this.isSubmitting = false;
                return;
            }

            if (!response.ok) {
                this.loginError = "No se pudo iniciar sesión. Inténtalo de nuevo.";
                this.isSubmitting = false;
                return;
            }

            if (!result || typeof result.token !== "string" || !result.token) {
                this.loginError = "El servicio respondió sin un token de sesión válido.";
                this.isSubmitting = false;
                return;
            }

            try {
                localStorage.setItem("token", result.token);
            } catch {
                this.loginError = "No fue posible guardar la sesión en este navegador.";
                this.isSubmitting = false;
                return;
            }

            this.isSubmitting = false;
            this.loginSuccess = "Inicio de sesión exitoso. Tu sesión está activa.";
        }
    }
};

createApp(Login).mount("#app");
