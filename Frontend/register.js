const { createApp } = Vue;
const API_BASE_URL = "http://localhost:3000";
const RECAPTCHA_SITE_KEY = window.RESERVAS_RECAPTCHA_SITE_KEY || "";

const Register = {
    data() {
        return {
            name: "",
            email: "",
            phone: "",
            password: "",
            passwordConfirmation: "",
            captchaSiteKey: RECAPTCHA_SITE_KEY,
            termsAccepted: false,
            captchaToken: "",
            captchaWidgetId: null,
            captchaError: "",
            captchaConfigError: "",
            captchaScriptError: false,
            showPassword: false,
            showConfirmation: false,
            isSubmitting: false,
            errors: {
                name: "",
                email: "",
                phone: "",
                password: "",
                passwordConfirmation: ""
            },
            registerError: ""
        };
    },
    computed: {
        passwordChecks() {
            return {
                length: this.password.length >= 8,
                lowercase: /[a-z]/.test(this.password),
                uppercase: /[A-Z]/.test(this.password),
                number: /\d/.test(this.password),
                symbol: /[^A-Za-z0-9]/.test(this.password),
                byteLength: new TextEncoder().encode(this.password).length <= 72
            };
        }
    },
    mounted() {
        this.initializeCaptcha();
    },
    template: `
        <main class="login-page register-page">
            <section class="login-card register-card" aria-labelledby="register-title">
                <header class="brand">
                    <div class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6M8 10h.01M16 10h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <span class="brand-name">Sistema de Reservas</span>
                </header>

                <div class="intro register-intro">
                    <p class="eyebrow">Empieza ahora</p>
                    <h1 id="register-title">Crea tu cuenta</h1>
                    <p class="subtitle">Completa tus datos para unirte al sistema.</p>
                </div>

                <form class="login-form register-form" novalidate @submit.prevent="handleRegister">
                    <div class="form-group">
                        <label for="name">Nombre completo</label>
                        <input
                            id="name"
                            ref="nameInput"
                            v-model="name"
                            type="text"
                            name="name"
                            autocomplete="name"
                            placeholder="Ej. María García"
                            maxlength="100"
                            :aria-invalid="Boolean(errors.name)"
                            :aria-describedby="errors.name ? 'name-error' : null"
                            @input="clearField('name')"
                        >
                        <p v-if="errors.name" id="name-error" class="field-error">{{ errors.name }}</p>
                    </div>

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
                            maxlength="254"
                            :aria-invalid="Boolean(errors.email)"
                            :aria-describedby="errors.email ? 'email-error' : null"
                            @input="clearField('email')"
                        >
                        <p v-if="errors.email" id="email-error" class="field-error">{{ errors.email }}</p>
                    </div>

                    <div class="form-group">
                        <label for="phone">Teléfono</label>
                        <input
                            id="phone"
                            ref="phoneInput"
                            v-model="phone"
                            type="tel"
                            name="phone"
                            autocomplete="tel"
                            placeholder="Ej. +57 300 123 4567"
                            maxlength="20"
                            :aria-invalid="Boolean(errors.phone)"
                            :aria-describedby="errors.phone ? 'phone-error' : null"
                            @input="clearField('phone')"
                        >
                        <p v-if="errors.phone" id="phone-error" class="field-error">{{ errors.phone }}</p>
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
                                autocomplete="new-password"
                                placeholder="Crea una contraseña segura"
                                :aria-invalid="Boolean(errors.password)"
                                :aria-describedby="errors.password ? 'password-error password-rules' : 'password-rules'"
                                @input="clearField('password'); clearField('passwordConfirmation')"
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
                        <ul id="password-rules" class="password-rules" aria-label="Requisitos de contraseña">
                            <li :class="{ 'rule-met': passwordChecks.length }">
                                <span aria-hidden="true">{{ passwordChecks.length ? '✓' : '○' }}</span> Al menos 8 caracteres
                            </li>
                            <li :class="{ 'rule-met': passwordChecks.lowercase }">
                                <span aria-hidden="true">{{ passwordChecks.lowercase ? '✓' : '○' }}</span> Una letra minúscula
                            </li>
                            <li :class="{ 'rule-met': passwordChecks.uppercase }">
                                <span aria-hidden="true">{{ passwordChecks.uppercase ? '✓' : '○' }}</span> Una letra mayúscula
                            </li>
                            <li :class="{ 'rule-met': passwordChecks.number }">
                                <span aria-hidden="true">{{ passwordChecks.number ? '✓' : '○' }}</span> Un número
                            </li>
                            <li :class="{ 'rule-met': passwordChecks.symbol }">
                                <span aria-hidden="true">{{ passwordChecks.symbol ? '✓' : '○' }}</span> Un símbolo
                            </li>
                        </ul>
                        <p v-if="errors.password" id="password-error" class="field-error">{{ errors.password }}</p>
                        <p v-if="errors.passwordLength" class="field-error">{{ errors.passwordLength }}</p>
                    </div>

                    <div class="form-group">
                        <label for="passwordConfirmation">Confirmar contraseña</label>
                        <div class="password-field">
                            <input
                                id="passwordConfirmation"
                                ref="passwordConfirmationInput"
                                v-model="passwordConfirmation"
                                :type="showConfirmation ? 'text' : 'password'"
                                name="passwordConfirmation"
                                autocomplete="new-password"
                                placeholder="Repite tu contraseña"
                                :aria-invalid="Boolean(errors.passwordConfirmation)"
                                :aria-describedby="errors.passwordConfirmation ? 'confirmation-error' : null"
                                @input="clearField('passwordConfirmation')"
                            >
                            <button
                                class="password-toggle"
                                type="button"
                                :aria-label="showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'"
                                :aria-pressed="showConfirmation"
                                @click="showConfirmation = !showConfirmation"
                            >
                                <svg v-if="!showConfirmation" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="2.5" stroke="currentColor" stroke-width="1.7"/>
                                </svg>
                                <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3.1 3.5M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.4 6 9.5 6c1.1 0 2.1-.2 3-.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                        <p v-if="errors.passwordConfirmation" id="confirmation-error" class="field-error">{{ errors.passwordConfirmation }}</p>
                    </div>

                    <div class="registration-requirements">
                        <label class="terms-control" for="termsAccepted">
                            <input
                                id="termsAccepted"
                                ref="termsAcceptedInput"
                                v-model="termsAccepted"
                                type="checkbox"
                                name="termsAccepted"
                                :aria-invalid="Boolean(errors.termsAccepted)"
                                :aria-describedby="errors.termsAccepted ? 'terms-error' : null"
                                @change="clearField('termsAccepted')"
                            >
                            <span>Acepto los términos y condiciones.</span>
                        </label>
                        <p v-if="errors.termsAccepted" id="terms-error" class="field-error">{{ errors.termsAccepted }}</p>
                    </div>

                    <div class="captcha-group">
                        <p class="captcha-label">Verificación de seguridad</p>
                        <div ref="captchaContainer" class="captcha-container"></div>
                        <p v-if="captchaConfigError" class="captcha-message" role="status">{{ captchaConfigError }}</p>
                        <p v-else-if="captchaScriptError" class="field-error" role="alert">
                            No se pudo cargar la verificación CAPTCHA. Revisa tu conexión e inténtalo de nuevo.
                        </p>
                        <p v-if="errors.captchaToken || captchaError" class="field-error" role="alert">
                            {{ errors.captchaToken || captchaError }}
                        </p>
                    </div>

                    <p v-if="registerError" class="login-error" role="alert">{{ registerError }}</p>

                    <button class="login-button" type="submit" :disabled="isSubmitting || !captchaSiteKey">
                        <span v-if="isSubmitting" class="spinner" aria-hidden="true"></span>
                        {{ !captchaSiteKey ? 'Verificación no configurada' : isSubmitting ? 'Creando cuenta...' : 'Crear cuenta' }}
                    </button>
                </form>

                <footer class="register-footer">
                    ¿Ya tienes cuenta? <a href="./index.html">Iniciar sesión</a>
                </footer>
            </section>
        </main>
    `,
    methods: {
        clearField(field) {
            this.errors[field] = "";
            this.registerError = "";
        },
        initializeCaptcha() {
            if (!RECAPTCHA_SITE_KEY) {
                this.captchaConfigError = "Para activar el registro, configura la clave de sitio de reCAPTCHA en Frontend/config.js.";
                return;
            }

            if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
                this.renderCaptcha();
                return;
            }

            window.reservasCaptchaLoaded = () => this.renderCaptcha();

            const script = document.createElement("script");
            script.src = "https://www.google.com/recaptcha/api.js?onload=reservasCaptchaLoaded&render=explicit";
            script.async = true;
            script.defer = true;
            script.onerror = () => {
                this.captchaScriptError = true;
            };
            document.head.appendChild(script);
        },
        renderCaptcha() {
            if (this.captchaWidgetId !== null || !this.$refs.captchaContainer) {
                return;
            }

            this.captchaWidgetId = window.grecaptcha.render(this.$refs.captchaContainer, {
                sitekey: RECAPTCHA_SITE_KEY,
                callback: (token) => {
                    this.captchaToken = token;
                    this.captchaError = "";
                    this.errors.captchaToken = "";
                },
                "expired-callback": () => {
                    this.captchaToken = "";
                    this.captchaError = "La verificación expiró. Complétala de nuevo.";
                },
                "error-callback": () => {
                    this.captchaToken = "";
                    this.captchaError = "No se pudo validar CAPTCHA. Comprueba tu conexión e inténtalo de nuevo.";
                }
            });
        },
        resetCaptcha() {
            this.captchaToken = "";
            if (this.captchaWidgetId !== null && window.grecaptcha) {
                window.grecaptcha.reset(this.captchaWidgetId);
            }
        },
        validateForm() {
            this.errors = {
                name: "",
                email: "",
                phone: "",
                password: "",
                passwordConfirmation: "",
                passwordLength: "",
                termsAccepted: "",
                captchaToken: ""
            };
            this.registerError = "";

            const name = this.name.trim();
            const email = this.email.trim();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneDigits = this.phone.replace(/\D/g, "");

            if (name.length < 2) {
                this.errors.name = "Ingresa tu nombre completo.";
            }

            if (!email) {
                this.errors.email = "El correo electrónico es obligatorio.";
            } else if (!emailPattern.test(email)) {
                this.errors.email = "Ingresa un correo electrónico válido.";
            }

            if (!this.phone.trim()) {
                this.errors.phone = "El teléfono es obligatorio.";
            } else if (!/^\+?[0-9\s().-]{7,30}$/.test(this.phone.trim()) || phoneDigits.length < 7) {
                this.errors.phone = "Ingresa un teléfono válido.";
            }

            if (
                this.password.length < 8
                || !/[a-z]/.test(this.password)
                || !/[A-Z]/.test(this.password)
                || !/\d/.test(this.password)
                || !/[^A-Za-z0-9]/.test(this.password)
            ) {
                this.errors.password = "Usa al menos 8 caracteres, mayúscula, minúscula, número y símbolo.";
            }

            if (!this.passwordChecks.byteLength) {
                this.errors.passwordLength = "La contraseña no puede superar los 72 bytes.";
            }

            if (!this.passwordConfirmation) {
                this.errors.passwordConfirmation = "Confirma tu contraseña.";
            } else if (this.password !== this.passwordConfirmation) {
                this.errors.passwordConfirmation = "Las contraseñas no coinciden.";
            }

            if (!this.termsAccepted) {
                this.errors.termsAccepted = "Debes aceptar los términos y condiciones.";
            }

            if (!this.captchaToken) {
                this.errors.captchaToken = "Completa la verificación CAPTCHA.";
            }

            const firstInvalidField = [
                "name",
                "email",
                "phone",
                "password",
                "passwordConfirmation",
                "termsAccepted"
            ].find((field) => this.errors[field]);

            if (firstInvalidField) {
                this.$refs[`${firstInvalidField}Input`].focus();
                return false;
            }

            return true;
        },
        async handleRegister() {
            if (!this.validateForm()) {
                return;
            }

            this.isSubmitting = true;

            let response;
            try {
                response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        name: this.name.trim(),
                        email: this.email.trim(),
                        phone: this.phone.trim(),
                        password: this.password,
                        confirmPassword: this.passwordConfirmation,
                        termsAccepted: this.termsAccepted,
                        captchaToken: this.captchaToken
                    })
                });
            } catch {
                this.registerError = "No se pudo conectar con el servicio. Inténtalo de nuevo.";
                this.isSubmitting = false;
                return;
            }

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (!response.ok) {
                if (response.status === 404) {
                    this.registerError = "El servicio de registro aún no está disponible.";
                } else {
                    this.registerError = result?.message || "No se pudo crear la cuenta. Inténtalo de nuevo.";
                }
                this.resetCaptcha();
                this.isSubmitting = false;
                return;
            }

            window.location.assign("./index.html?registered=1");
        }
    }
};

createApp(Register).mount("#app");
