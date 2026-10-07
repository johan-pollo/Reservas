const { createApp } = Vue;
const API_BASE_URL = "http://localhost:3000";

const Dashboard = {
    data() {
        return {
            token: localStorage.getItem("token"),
            user: null,
            stats: null,
            recentReservations: [],
            isLoading: true,
            loadError: "",
            isUserMenuOpen: false,
            isSidebarOpen: false
        };
    },
    computed: {
        userInitials() {
            const name = this.user?.name?.trim();
            if (!name) {
                return "U";
            }

            return name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0).toLocaleUpperCase("es"))
                .join("");
        },
        displayName() {
            return this.user?.name?.trim() || "Usuario";
        },
        displayRole() {
            return this.user?.role === "admin" ? "Administrador" : "Usuario";
        },
        reservationCards() {
            if (!this.stats?.reservations) {
                return [];
            }

            return [
                { key: "pending", label: "Pendientes", value: this.stats.reservations.pending, tone: "amber" },
                { key: "confirmed", label: "Confirmadas", value: this.stats.reservations.confirmed, tone: "green" },
                { key: "completed", label: "Completadas", value: this.stats.reservations.completed, tone: "blue" }
            ];
        }
    },
    template: `
        <div class="dashboard-shell">
            <button
                v-if="isSidebarOpen"
                class="sidebar-backdrop"
                type="button"
                aria-label="Cerrar menú"
                @click="isSidebarOpen = false"
            ></button>

            <aside class="dashboard-sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
                <a class="dashboard-brand" href="./dashboard.html" aria-label="Sistema de Reservas, inicio">
                    <span class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span>Sistema de Reservas</span>
                </a>

                <p class="sidebar-section-label">MENÚ</p>
                <nav class="sidebar-nav" aria-label="Navegación principal">
                    <a class="sidebar-link active" href="#overview" aria-current="page" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                        </svg>
                        Resumen
                    </a>
                    <a class="sidebar-link" href="./services.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 8h16l-1.2 11H5.2L4 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                            <path d="M8 8a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Servicios
                    </a>
                    <a class="sidebar-link" href="#reservations" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h3M14 13h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Reservas
                    </a>
                    <a v-if="user?.role === 'admin'" class="sidebar-link" href="./users.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 4.2a4 4 0 0 1 0 7.6M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Usuarios
                    </a>
                </nav>

                <div class="sidebar-bottom">
                    <div class="sidebar-help">
                        <span class="help-icon" aria-hidden="true">?</span>
                        <span>¿Necesitas ayuda?<br><small>Consulta tus reservas aquí.</small></span>
                    </div>
                </div>
            </aside>

            <div class="dashboard-main">
                <header class="dashboard-header">
                    <div class="header-leading">
                        <button
                            class="mobile-menu-button"
                            type="button"
                            aria-label="Abrir menú"
                            :aria-expanded="isSidebarOpen"
                            @click="isSidebarOpen = !isSidebarOpen"
                        >
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                            </svg>
                        </button>
                        <div>
                            <p class="header-eyebrow">Sistema de Reservas</p>
                            <p class="header-context">Panel principal</p>
                        </div>
                    </div>

                    <div class="user-menu-wrap">
                        <button
                            class="user-menu-trigger"
                            type="button"
                            :aria-expanded="isUserMenuOpen"
                            aria-haspopup="menu"
                            @click="isUserMenuOpen = !isUserMenuOpen"
                        >
                            <span class="avatar">{{ userInitials }}</span>
                            <span class="user-menu-copy">
                                <strong>{{ displayName }}</strong>
                                <small>{{ displayRole }}</small>
                            </span>
                            <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="m7 10 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <div v-if="isUserMenuOpen" class="user-dropdown" role="menu">
                            <div class="dropdown-user">
                                <strong>{{ displayName }}</strong>
                                <span>{{ displayRole }}</span>
                            </div>
                            <button class="logout-button" type="button" role="menuitem" @click="logout">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </header>

                <main id="overview" class="dashboard-content">
                    <section class="dashboard-welcome">
                        <div>
                            <p class="eyebrow">Tu espacio, de un vistazo</p>
                            <h1>Hola, {{ displayName }} <span aria-hidden="true">👋</span></h1>
                            <p class="welcome-copy">Aquí tienes el resumen de tu actividad y tus reservas.</p>
                        </div>
                        <button class="refresh-button" type="button" :disabled="isLoading" @click="loadDashboard">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" :class="{ 'is-spinning': isLoading }">
                                <path d="M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.4 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>Actualizar</span>
                        </button>
                    </section>

                    <section v-if="loadError" class="dashboard-alert" role="alert">
                        <div>
                            <strong>No pudimos cargar el resumen</strong>
                            <p>{{ loadError }}</p>
                        </div>
                        <button type="button" class="alert-retry" @click="loadDashboard">Reintentar</button>
                    </section>

                    <section class="stats-grid" aria-label="Resumen de métricas">
                        <article class="stat-card stat-card-blue">
                            <div class="stat-card-top">
                                <span class="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 4.2a4 4 0 0 1 0 7.6M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                    </svg>
                                </span>
                                <span class="stat-chip">Usuarios</span>
                            </div>
                            <p class="stat-label">Usuarios registrados</p>
                            <p class="stat-value" aria-live="polite">{{ isLoading && !stats ? '—' : stats?.users ?? '—' }}</p>
                            <p class="stat-footnote">{{ stats?.users === null ? 'Disponible para administradores' : 'Cuentas en el sistema' }}</p>
                        </article>

                        <article id="services" class="stat-card stat-card-purple">
                            <div class="stat-card-top">
                                <span class="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M4 8h16l-1.2 11H5.2L4 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                                        <path d="M8 8a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                    </svg>
                                </span>
                                <span class="stat-chip">Catálogo</span>
                            </div>
                            <p class="stat-label">Servicios disponibles</p>
                            <p class="stat-value" aria-live="polite">{{ isLoading && !stats ? '—' : stats?.services?.active ?? '—' }}</p>
                            <p class="stat-footnote">De {{ stats?.services?.total ?? '—' }} servicios en total</p>
                        </article>

                        <article class="stat-card stat-card-amber">
                            <div class="stat-card-top">
                                <span class="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                                        <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                    </svg>
                                </span>
                                <span class="stat-chip">Reservas</span>
                            </div>
                            <p class="stat-label">Total de reservas</p>
                            <p class="stat-value" aria-live="polite">{{ isLoading && !stats ? '—' : stats?.reservations?.total ?? '—' }}</p>
                            <p class="stat-footnote">Actividad registrada</p>
                        </article>

                        <article class="stat-card stat-card-green">
                            <div class="stat-card-top">
                                <span class="stat-icon">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
                                        <path d="m8 12 2.5 2.5L16.5 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </span>
                                <span class="stat-chip">Por atender</span>
                            </div>
                            <p class="stat-label">Reservas pendientes</p>
                            <p class="stat-value" aria-live="polite">{{ isLoading && !stats ? '—' : stats?.reservations?.pending ?? '—' }}</p>
                            <p class="stat-footnote">Esperando confirmación</p>
                        </article>
                    </section>

                    <section class="reservation-section" id="reservations">
                        <div class="section-heading">
                            <div>
                                <p class="eyebrow">Actividad reciente</p>
                                <h2>Estado de tus reservas</h2>
                            </div>
                            <span v-if="stats" class="section-total">{{ stats.reservations.total }} en total</span>
                        </div>

                        <div class="reservation-status-grid">
                            <article v-for="reservation in reservationCards" :key="reservation.key" class="status-card">
                                <span class="status-indicator" :class="'status-' + reservation.tone"></span>
                                <span class="status-label">{{ reservation.label }}</span>
                                <strong>{{ reservation.value }}</strong>
                            </article>
                        </div>

                        <div class="recent-panel">
                            <div class="recent-heading">
                                <div>
                                    <h3>Reservas recientes</h3>
                                    <p>Las últimas actualizaciones de tu actividad.</p>
                                </div>
                            </div>

                            <div v-if="isLoading && !stats" class="empty-state">
                                <span class="loading-indicator" aria-hidden="true"></span>
                                <span>Cargando tus métricas...</span>
                            </div>
                            <div v-else-if="!loadError && recentReservations.length === 0" class="empty-state">
                                <span class="empty-calendar" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                                        <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                    </svg>
                                </span>
                                <span>Aún no hay reservas para mostrar.</span>
                            </div>
                            <ul v-else-if="recentReservations.length" class="recent-list">
                                <li v-for="reservation in recentReservations" :key="reservation.id" class="recent-item">
                                    <span class="recent-date-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                        </svg>
                                    </span>
                                    <span class="recent-detail">
                                        <strong>{{ formatDate(reservation.date) }}</strong>
                                        <small>{{ reservation.time || 'Hora pendiente' }}<span v-if="reservation.notes"> · {{ reservation.notes }}</span></small>
                                    </span>
                                    <span class="reservation-badge" :class="'badge-' + reservation.status">
                                        {{ statusLabel(reservation.status) }}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    `,
    mounted() {
        if (!this.token) {
            window.location.replace("./index.html");
            return;
        }

        this.loadDashboard();
        document.addEventListener("click", this.handleOutsideClick);
    },
    beforeUnmount() {
        document.removeEventListener("click", this.handleOutsideClick);
    },
    methods: {
        async loadDashboard() {
            if (!this.token) {
                this.logout();
                return;
            }

            this.isLoading = true;
            this.loadError = "";

            let response;
            try {
                response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${this.token}`
                    }
                });
            } catch {
                this.loadError = "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
                this.isLoading = false;
                return;
            }

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (response.status === 401 || response.status === 403) {
                this.logout();
                return;
            }

            if (!response.ok) {
                this.loadError = result?.message || "El servidor no pudo cargar las métricas.";
                this.isLoading = false;
                return;
            }

            if (
                !result
                || !result.stats
                || !result.stats.services
                || !result.stats.reservations
                || !Array.isArray(result.recentReservations)
            ) {
                this.loadError = "El servidor respondió con un formato de métricas no válido.";
                this.isLoading = false;
                return;
            }

            this.user = result.user || null;
            this.stats = result.stats;
            this.recentReservations = result.recentReservations;
            this.isLoading = false;
        },
        logout() {
            localStorage.removeItem("token");
            window.location.replace("./index.html");
        },
        handleOutsideClick(event) {
            if (!event.target.closest(".user-menu-wrap")) {
                this.isUserMenuOpen = false;
            }
        },
        formatDate(value) {
            if (!value) {
                return "Fecha pendiente";
            }

            const dateValue = typeof value === "string" ? value.slice(0, 10) : value;
            const date = new Date(`${dateValue}T00:00:00`);
            if (Number.isNaN(date.getTime())) {
                return String(value);
            }

            return new Intl.DateTimeFormat("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(date);
        },
        statusLabel(status) {
            const labels = {
                pending: "Pendiente",
                confirmed: "Confirmada",
                cancelled: "Cancelada",
                completed: "Completada"
            };
            return labels[status] || "Sin estado";
        }
    }
};

createApp(Dashboard).mount("#app");
