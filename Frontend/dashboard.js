const { createApp } = Vue;

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
            isSidebarOpen: false,
            currentView: "overview", // 'overview' | 'reservations' | 'new-reservation'

            // HUS-07: Listado de reservas
            reservations: [],
            isLoadingReservations: false,
            reservationsError: "",
            pagination: {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 1
            },
            filters: {
                status: "",
                startDate: "",
                endDate: ""
            },

            // Catálogo de servicios disponibles
            services: [],
            isLoadingServices: false,

            // HUS-06: Formulario para agendar reserva
            newForm: {
                serviceId: "",
                date: "",
                time: "",
                notes: ""
            },
            isSubmittingNew: false,
            newError: "",
            newSuccess: "",

            // HUS-08: Modal para reprogramar
            isRescheduleModalOpen: false,
            rescheduleTarget: null,
            rescheduleForm: {
                date: "",
                time: "",
                notes: ""
            },
            isSubmittingReschedule: false,
            rescheduleError: "",
            rescheduleSuccess: "",

            // HUS-09: Modal de confirmación para cancelar
            isCancelModalOpen: false,
            cancelTarget: null,
            isSubmittingCancel: false,
            cancelError: "",

            // Notificación flotante / banner
            notification: null
        };
    },
    computed: {
        userInitials() {
            const name = this.user?.name?.trim();
            if (!name) return "U";

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
            if (!this.stats?.reservations) return [];

            return [
                { key: "pending", label: "Pendientes", value: this.stats.reservations.pending, tone: "amber" },
                { key: "confirmed", label: "Confirmadas", value: this.stats.reservations.confirmed, tone: "green" },
                { key: "completed", label: "Completadas", value: this.stats.reservations.completed, tone: "blue" }
            ];
        },
        todayDateString() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        },
        selectedServiceDetails() {
            if (!this.newForm.serviceId || !this.services.length) return null;
            return this.services.find(s => s.id === this.newForm.serviceId) || null;
        }
    },
    template: `
        <div class="dashboard-shell">
            <!-- Backdrop para móvil -->
            <button
                v-if="isSidebarOpen"
                class="sidebar-backdrop"
                type="button"
                aria-label="Cerrar menú"
                @click="isSidebarOpen = false"
            ></button>

            <!-- Menú lateral -->
            <aside class="dashboard-sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
                <a class="dashboard-brand" href="#overview" @click.prevent="setView('overview')">
                    <span class="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span>Sistema de Reservas</span>
                </a>

                <p class="sidebar-section-label">MENÚ PRINCIPAL</p>
                <nav class="sidebar-nav" aria-label="Navegación principal">
                    <button
                        class="sidebar-link"
                        :class="{ active: currentView === 'overview' }"
                        type="button"
                        @click="setView('overview')"
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                        </svg>
                        <span>Resumen</span>
                    </button>
                    <button
                        class="sidebar-link"
                        :class="{ active: currentView === 'reservations' }"
                        type="button"
                        @click="setView('reservations')"
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h3M14 13h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        <span>Mis reservas</span>
                    </button>
                    <button
                        class="sidebar-link"
                        :class="{ active: currentView === 'new-reservation' }"
                        type="button"
                        @click="setView('new-reservation')"
                    >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        <span>Nueva reserva</span>
                    </button>
                </nav>

                <div class="sidebar-bottom">
                    <div class="sidebar-help">
                        <span class="help-icon" aria-hidden="true">?</span>
                        <span>¿Gestionar citas?<br><small>Programa o reprograma fácilmente.</small></span>
                    </div>
                </div>
            </aside>

            <!-- Contenedor principal -->
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
                            <p class="header-context">
                                <span v-if="currentView === 'overview'">Panel de resumen</span>
                                <span v-else-if="currentView === 'reservations'">Mis Reservas (HUS-07)</span>
                                <span v-else-if="currentView === 'new-reservation'">Agendar Reserva (HUS-06)</span>
                            </p>
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

                <!-- Notificación global tipo toast -->
                <div v-if="notification" class="dashboard-toast" :class="'toast-' + notification.type" role="alert">
                    <span>{{ notification.text }}</span>
                    <button type="button" class="toast-close" @click="notification = null" aria-label="Cerrar notificación">&times;</button>
                </div>

                <!-- CONTENIDO SEGÚN LA VISTA ACTIVA -->

                <!-- 1. VISTA OVERVIEW (RESUMEN) -->
                <main v-if="currentView === 'overview'" class="dashboard-content">
                    <section class="dashboard-welcome">
                        <div>
                            <p class="eyebrow">Tu espacio, de un vistazo</p>
                            <h1>Hola, {{ displayName }} <span aria-hidden="true">👋</span></h1>
                            <p class="welcome-copy">Aquí tienes el resumen de tu actividad y tus reservas.</p>
                        </div>
                        <div class="welcome-actions">
                            <button class="btn-primary" type="button" @click="setView('new-reservation')">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                <span>Nueva reserva</span>
                            </button>
                            <button class="refresh-button" type="button" :disabled="isLoading" @click="loadDashboard">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" :class="{ 'is-spinning': isLoading }">
                                    <path d="M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.4 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>Actualizar</span>
                            </button>
                        </div>
                    </section>

                    <section v-if="loadError" class="dashboard-alert alert-danger" role="alert">
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
                            <p class="stat-value">{{ isLoading && !stats ? '—' : stats?.users ?? '—' }}</p>
                            <p class="stat-footnote">{{ stats?.users === null ? 'Disponible para administradores' : 'Cuentas en el sistema' }}</p>
                        </article>

                        <article class="stat-card stat-card-purple">
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
                            <p class="stat-value">{{ isLoading && !stats ? '—' : stats?.services?.active ?? '—' }}</p>
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
                            <p class="stat-value">{{ isLoading && !stats ? '—' : stats?.reservations?.total ?? '—' }}</p>
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
                            <p class="stat-value">{{ isLoading && !stats ? '—' : stats?.reservations?.pending ?? '—' }}</p>
                            <p class="stat-footnote">Esperando confirmación</p>
                        </article>
                    </section>

                    <section class="recent-panel">
                        <div class="recent-heading">
                            <div>
                                <h3>Reservas recientes</h3>
                                <p>Las últimas citas programadas en tu cuenta.</p>
                            </div>
                            <button class="btn-link" type="button" @click="setView('reservations')">
                                Ver todas las reservas &rarr;
                            </button>
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
                            <span>Aún no tienes reservas registradas.</span>
                            <button class="btn-primary btn-sm" type="button" @click="setView('new-reservation')">Crear tu primera reserva</button>
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
                                    <strong>{{ formatDate(reservation.date) }} &middot; {{ reservation.time || 'Hora pendiente' }}</strong>
                                    <small v-if="reservation.notes">{{ reservation.notes }}</small>
                                </span>
                                <span class="reservation-badge" :class="'badge-' + reservation.status">
                                    {{ statusLabel(reservation.status) }}
                                </span>
                            </li>
                        </ul>
                    </section>
                </main>

                <!-- 2. VISTA MIS RESERVAS (HUS-07, HUS-08, HUS-09) -->
                <main v-else-if="currentView === 'reservations'" class="dashboard-content">
                    <section class="section-top-bar">
                        <div>
                            <p class="eyebrow">Gestión de Citas (HUS-07)</p>
                            <h1>Mis reservas</h1>
                            <p class="subtitle">Consulta, filtra, reprograma o cancela tus reservas agendadas.</p>
                        </div>
                        <button class="btn-primary" type="button" @click="setView('new-reservation')">
                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            <span>Nueva reserva</span>
                        </button>
                    </section>

                    <!-- Filtros interactivos (HUS-07) -->
                    <section class="filter-card">
                        <form class="filter-grid" @submit.prevent="applyFilters">
                            <div class="filter-field">
                                <label for="filter-status">Estado</label>
                                <select id="filter-status" v-model="filters.status" class="form-input">
                                    <option value="">Todos los estados</option>
                                    <option value="confirmed">Confirmada</option>
                                    <option value="pending">Pendiente</option>
                                    <option value="completed">Completada</option>
                                    <option value="cancelled">Cancelada</option>
                                </select>
                            </div>

                            <div class="filter-field">
                                <label for="filter-startDate">Desde fecha</label>
                                <input id="filter-startDate" v-model="filters.startDate" type="date" class="form-input" />
                            </div>

                            <div class="filter-field">
                                <label for="filter-endDate">Hasta fecha</label>
                                <input id="filter-endDate" v-model="filters.endDate" type="date" class="form-input" />
                            </div>

                            <div class="filter-actions">
                                <button class="btn-secondary" type="submit" :disabled="isLoadingReservations">
                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                                    </svg>
                                    <span>Filtrar</span>
                                </button>
                                <button class="btn-subtle" type="button" @click="resetFilters" :disabled="isLoadingReservations">
                                    Limpiar
                                </button>
                            </div>
                        </form>
                    </section>

                    <!-- Mensaje de error si falla la consulta -->
                    <section v-if="reservationsError" class="dashboard-alert alert-danger" role="alert">
                        <div>
                            <strong>No pudimos cargar tus reservas</strong>
                            <p>{{ reservationsError }}</p>
                        </div>
                        <button type="button" class="alert-retry" @click="loadReservations">Reintentar</button>
                    </section>

                    <!-- Contenedor de la lista / tabla de reservas -->
                    <section class="data-panel">
                        <div v-if="isLoadingReservations" class="empty-state">
                            <span class="loading-indicator" aria-hidden="true"></span>
                            <span>Cargando reservas...</span>
                        </div>

                        <div v-else-if="reservations.length === 0" class="empty-state">
                            <span class="empty-calendar" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                                    <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                </svg>
                            </span>
                            <strong>No se encontraron reservas con los filtros aplicados.</strong>
                            <p>Puedes cambiar los filtros o crear una nueva cita.</p>
                            <button class="btn-primary btn-sm" type="button" @click="setView('new-reservation')">Agendar reserva</button>
                        </div>

                        <div v-else class="table-responsive">
                            <table class="reservations-table">
                                <thead>
                                    <tr>
                                        <th>Servicio</th>
                                        <th>Fecha y Hora</th>
                                        <th>Observaciones</th>
                                        <th>Estado</th>
                                        <th class="text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in reservations" :key="item.id" :class="{ 'row-cancelled': item.status === 'cancelled' }">
                                        <td>
                                            <div class="service-cell">
                                                <strong>{{ item.service?.name || 'Servicio general' }}</strong>
                                                <small v-if="item.service?.category">{{ item.service.category }} &middot; {{ item.service?.durationMinutes }} min</small>
                                                <span v-if="item.service?.price !== undefined" class="cell-price">{{ formatPrice(item.service.price) }}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div class="datetime-cell">
                                                <span class="date-badge">{{ formatDate(item.date) }}</span>
                                                <span class="time-text">{{ item.time }}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="notes-text">{{ item.notes || '—' }}</span>
                                        </td>
                                        <td>
                                            <span class="reservation-badge" :class="'badge-' + item.status">
                                                {{ statusLabel(item.status) }}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="action-buttons">
                                                <!-- HUS-08: Reprogramar (deshabilitado si cancelada) -->
                                                <button
                                                    class="btn-action-edit"
                                                    type="button"
                                                    :disabled="item.status === 'cancelled'"
                                                    :title="item.status === 'cancelled' ? 'No se puede reprogramar una reserva cancelada' : 'Reprogramar fecha y hora'"
                                                    @click="openRescheduleModal(item)"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                        <path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                                    </svg>
                                                    <span>Reprogramar</span>
                                                </button>

                                                <!-- HUS-09: Cancelar (deshabilitado si ya cancelada o completada) -->
                                                <button
                                                    class="btn-action-cancel"
                                                    type="button"
                                                    :disabled="item.status === 'cancelled' || item.status === 'completed'"
                                                    :title="item.status === 'cancelled' ? 'Esta reserva ya está cancelada' : 'Cancelar reserva'"
                                                    @click="openCancelModal(item)"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                                                    </svg>
                                                    <span>Cancelar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Paginación (HUS-07) -->
                        <div v-if="pagination.totalPages > 1" class="pagination-bar">
                            <span class="pagination-info">
                                Mostrando página {{ pagination.page }} de {{ pagination.totalPages }} (Total: {{ pagination.total }} reservas)
                            </span>
                            <div class="pagination-buttons">
                                <button
                                    class="btn-subtle"
                                    type="button"
                                    :disabled="pagination.page <= 1 || isLoadingReservations"
                                    @click="goToPage(pagination.page - 1)"
                                >
                                    &larr; Anterior
                                </button>
                                <button
                                    class="btn-subtle"
                                    type="button"
                                    :disabled="pagination.page >= pagination.totalPages || isLoadingReservations"
                                    @click="goToPage(pagination.page + 1)"
                                >
                                    Siguiente &rarr;
                                </button>
                            </div>
                        </div>
                    </section>
                </main>

                <!-- 3. VISTA CREAR RESERVA (HUS-06) -->
                <main v-else-if="currentView === 'new-reservation'" class="dashboard-content">
                    <section class="section-top-bar">
                        <div>
                            <p class="eyebrow">Nueva Cita (HUS-06)</p>
                            <h1>Agendar una reserva</h1>
                            <p class="subtitle">Selecciona el servicio deseado, fecha y horario disponible.</p>
                        </div>
                        <button class="btn-subtle" type="button" @click="setView('reservations')">
                            &larr; Volver a Mis reservas
                        </button>
                    </section>

                    <div class="form-wrapper-center">
                        <div class="booking-card">
                            <!-- Feedback de error (incluye manejo 409) -->
                            <div v-if="newError" class="dashboard-alert alert-danger" role="alert">
                                <div class="alert-content">
                                    <span class="alert-icon" aria-hidden="true">⚠️</span>
                                    <div>
                                        <strong>Error al agendar</strong>
                                        <p>{{ newError }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Feedback de éxito -->
                            <div v-if="newSuccess" class="dashboard-alert alert-success" role="alert">
                                <div class="alert-content">
                                    <span class="alert-icon" aria-hidden="true">✅</span>
                                    <div>
                                        <strong>¡Reserva agendada!</strong>
                                        <p>{{ newSuccess }}</p>
                                    </div>
                                </div>
                                <div class="alert-actions">
                                    <button class="btn-primary btn-sm" type="button" @click="setView('reservations')">Ver mis reservas</button>
                                    <button class="btn-subtle btn-sm" type="button" @click="resetNewForm">Agendar otra</button>
                                </div>
                            </div>

                            <form v-if="!newSuccess" class="booking-form" @submit.prevent="submitCreateReservation">
                                <!-- Selección de servicio -->
                                <div class="form-group">
                                    <label for="new-serviceId">Servicio <span class="req">*</span></label>
                                    <select
                                        id="new-serviceId"
                                        v-model="newForm.serviceId"
                                        class="form-input"
                                        required
                                        :disabled="isLoadingServices || isSubmittingNew"
                                    >
                                        <option value="" disabled>Selecciona un servicio...</option>
                                        <option v-for="srv in services" :key="srv.id" :value="srv.id">
                                            {{ srv.name }} &middot; {{ formatPrice(srv.price) }} ({{ srv.durationMinutes }} min)
                                        </option>
                                    </select>
                                    <p v-if="isLoadingServices" class="input-hint">Cargando catálogo de servicios...</p>
                                    <p v-else-if="selectedServiceDetails" class="service-preview-hint">
                                        {{ selectedServiceDetails.description || 'Sin descripción adicional' }}
                                    </p>
                                </div>

                                <div class="form-row-2">
                                    <!-- Fecha -->
                                    <div class="form-group">
                                        <label for="new-date">Fecha de la cita <span class="req">*</span></label>
                                        <input
                                            id="new-date"
                                            v-model="newForm.date"
                                            type="date"
                                            class="form-input"
                                            :min="todayDateString"
                                            required
                                            :disabled="isSubmittingNew"
                                        />
                                    </div>

                                    <!-- Hora -->
                                    <div class="form-group">
                                        <label for="new-time">Hora (HH:mm) <span class="req">*</span></label>
                                        <input
                                            id="new-time"
                                            v-model="newForm.time"
                                            type="time"
                                            class="form-input"
                                            required
                                            :disabled="isSubmittingNew"
                                        />
                                        <span class="input-hint">Formato 24 horas (ej. 10:30, 15:00)</span>
                                    </div>
                                </div>

                                <!-- Observaciones -->
                                <div class="form-group">
                                    <label for="new-notes">Observaciones adicionales</label>
                                    <textarea
                                        id="new-notes"
                                        v-model="newForm.notes"
                                        class="form-textarea"
                                        rows="3"
                                        maxlength="500"
                                        placeholder="Detalles adicionales, requerimientos especiales o notas..."
                                        :disabled="isSubmittingNew"
                                    ></textarea>
                                    <span class="input-hint">{{ (newForm.notes || '').length }}/500 caracteres</span>
                                </div>

                                <div class="form-footer-actions">
                                    <button class="btn-subtle" type="button" @click="setView('reservations')" :disabled="isSubmittingNew">
                                        Cancelar
                                    </button>
                                    <button class="btn-primary" type="submit" :disabled="isSubmittingNew">
                                        <span v-if="isSubmittingNew" class="spinner" aria-hidden="true"></span>
                                        <span>{{ isSubmittingNew ? 'Agendando...' : 'Confirmar Reserva' }}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            <!-- MODAL REPROGRAMAR FECHA Y HORA (HUS-08) -->
            <div v-if="isRescheduleModalOpen" class="modal-backdrop" @click.self="closeRescheduleModal">
                <div class="modal-card" role="dialog" aria-labelledby="modal-reschedule-title" aria-modal="true">
                    <header class="modal-header">
                        <div>
                            <p class="eyebrow">Reprogramar (HUS-08)</p>
                            <h2 id="modal-reschedule-title">Modificar horario de reserva</h2>
                        </div>
                        <button class="modal-close" type="button" @click="closeRescheduleModal" aria-label="Cerrar">&times;</button>
                    </header>

                    <div class="modal-body">
                        <!-- Alerta informativa del servicio actual -->
                        <div v-if="rescheduleTarget" class="reschedule-context">
                            <strong>{{ rescheduleTarget.service?.name || 'Servicio' }}</strong>
                            <p>Horario actual: {{ formatDate(rescheduleTarget.date) }} a las {{ rescheduleTarget.time }}</p>
                        </div>

                        <!-- Error en reprogramación (manejo 409 de traslape) -->
                        <div v-if="rescheduleError" class="dashboard-alert alert-danger" role="alert">
                            <div class="alert-content">
                                <span class="alert-icon" aria-hidden="true">⚠️</span>
                                <div>
                                    <strong>Conflicto al reprogramar</strong>
                                    <p>{{ rescheduleError }}</p>
                                </div>
                            </div>
                        </div>

                        <form class="modal-form" @submit.prevent="submitReschedule">
                            <div class="form-row-2">
                                <div class="form-group">
                                    <label for="reschedule-date">Nueva fecha <span class="req">*</span></label>
                                    <input
                                        id="reschedule-date"
                                        v-model="rescheduleForm.date"
                                        type="date"
                                        class="form-input"
                                        :min="todayDateString"
                                        required
                                        :disabled="isSubmittingReschedule"
                                    />
                                </div>
                                <div class="form-group">
                                    <label for="reschedule-time">Nueva hora (HH:mm) <span class="req">*</span></label>
                                    <input
                                        id="reschedule-time"
                                        v-model="rescheduleForm.time"
                                        type="time"
                                        class="form-input"
                                        required
                                        :disabled="isSubmittingReschedule"
                                    />
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="reschedule-notes">Observaciones</label>
                                <textarea
                                    id="reschedule-notes"
                                    v-model="rescheduleForm.notes"
                                    class="form-textarea"
                                    rows="2"
                                    maxlength="500"
                                    :disabled="isSubmittingReschedule"
                                ></textarea>
                            </div>

                            <div class="modal-footer">
                                <button class="btn-subtle" type="button" @click="closeRescheduleModal" :disabled="isSubmittingReschedule">
                                    Cerrar
                                </button>
                                <button class="btn-primary" type="submit" :disabled="isSubmittingReschedule">
                                    <span v-if="isSubmittingReschedule" class="spinner" aria-hidden="true"></span>
                                    <span>{{ isSubmittingReschedule ? 'Guardando...' : 'Guardar nueva fecha' }}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- MODAL CONFIRMAR CANCELACIÓN (HUS-09) -->
            <div v-if="isCancelModalOpen" class="modal-backdrop" @click.self="closeCancelModal">
                <div class="modal-card modal-card-sm" role="dialog" aria-labelledby="modal-cancel-title" aria-modal="true">
                    <header class="modal-header">
                        <div>
                            <p class="eyebrow text-danger">Liberar cupo (HUS-09)</p>
                            <h2 id="modal-cancel-title">¿Cancelar esta reserva?</h2>
                        </div>
                        <button class="modal-close" type="button" @click="closeCancelModal" aria-label="Cerrar">&times;</button>
                    </header>

                    <div class="modal-body">
                        <p class="confirm-message">
                            Estás a punto de cancelar la reserva para <strong>{{ cancelTarget?.service?.name || 'este servicio' }}</strong>
                            del día <strong>{{ formatDate(cancelTarget?.date) }}</strong> a las <strong>{{ cancelTarget?.time }}</strong>.
                        </p>
                        <p class="confirm-note">
                            El horario será liberado inmediatamente para que otros usuarios puedan tomarlo. Esta acción no se puede deshacer.
                        </p>

                        <div v-if="cancelError" class="dashboard-alert alert-danger" role="alert">
                            <p>{{ cancelError }}</p>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-subtle" type="button" @click="closeCancelModal" :disabled="isSubmittingCancel">
                            Volver
                        </button>
                        <button class="btn-danger" type="button" :disabled="isSubmittingCancel" @click="confirmCancelReservation">
                            <span v-if="isSubmittingCancel" class="spinner" aria-hidden="true"></span>
                            <span>{{ isSubmittingCancel ? 'Cancelando...' : 'Sí, cancelar reserva' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    mounted() {
        if (!this.token) {
            window.location.replace("./index.html");
            return;
        }

        // Sincronizar vista según el hash de la URL
        this.syncViewFromHash();
        window.addEventListener("hashchange", this.syncViewFromHash);

        this.loadDashboard();
        this.loadServices();
        document.addEventListener("click", this.handleOutsideClick);
    },
    beforeUnmount() {
        window.removeEventListener("hashchange", this.syncViewFromHash);
        document.removeEventListener("click", this.handleOutsideClick);
    },
    methods: {
        syncViewFromHash() {
            const hash = window.location.hash.replace("#", "");
            if (hash === "reservations" || hash === "new-reservation") {
                this.setView(hash, false);
            } else {
                this.setView("overview", false);
            }
        },
        setView(viewName, updateHash = true) {
            this.currentView = viewName;
            this.isSidebarOpen = false;
            this.loadError = "";
            this.newError = "";
            this.newSuccess = "";

            if (updateHash) {
                window.location.hash = viewName;
            }

            if (viewName === "reservations") {
                this.loadReservations();
            } else if (viewName === "new-reservation") {
                if (!this.services.length) {
                    this.loadServices();
                }
            }
        },
        showNotification(text, type = "success") {
            this.notification = { text, type };
            setTimeout(() => {
                if (this.notification?.text === text) {
                    this.notification = null;
                }
            }, 5000);
        },

        // Cargar estadísticas y perfil (Overview)
        async loadDashboard() {
            if (!this.token) {
                this.logout();
                return;
            }

            this.isLoading = true;
            this.loadError = "";

            const result = await ReservationsApi.getDashboardStats();
            this.isLoading = false;

            if (result.status === 401 || result.status === 403) {
                this.logout();
                return;
            }

            if (!result.ok) {
                this.loadError = result.message || "El servidor no pudo cargar las métricas.";
                return;
            }

            const data = result.data;
            if (!data || !data.stats || !Array.isArray(data.recentReservations)) {
                this.loadError = "El servidor respondió con un formato de métricas no válido.";
                return;
            }

            this.user = data.user || null;
            this.stats = data.stats;
            this.recentReservations = data.recentReservations;
        },

        // Cargar catálogo de servicios para selección
        async loadServices() {
            this.isLoadingServices = true;
            const res = await ReservationsApi.getServices({ page: 1, limit: 100, status: 'active' });
            this.isLoadingServices = false;

            if (res.ok && res.data?.services) {
                this.services = res.data.services;
            }
        },

        // HUS-07: Cargar lista de reservas del usuario con filtros y paginación
        async loadReservations() {
            this.isLoadingReservations = true;
            this.reservationsError = "";

            const res = await ReservationsApi.getReservations({
                page: this.pagination.page,
                limit: this.pagination.limit,
                status: this.filters.status,
                startDate: this.filters.startDate,
                endDate: this.filters.endDate
            });

            this.isLoadingReservations = false;

            if (res.status === 401 || res.status === 403) {
                this.logout();
                return;
            }

            if (!res.ok) {
                this.reservationsError = res.message || "No se pudieron obtener las reservas.";
                return;
            }

            this.reservations = res.data?.reservations || [];
            if (res.data?.pagination) {
                this.pagination.total = res.data.pagination.total;
                this.pagination.totalPages = res.data.pagination.totalPages || 1;
            }
        },

        applyFilters() {
            this.pagination.page = 1;
            this.loadReservations();
        },

        resetFilters() {
            this.filters.status = "";
            this.filters.startDate = "";
            this.filters.endDate = "";
            this.pagination.page = 1;
            this.loadReservations();
        },

        goToPage(page) {
            if (page < 1 || page > this.pagination.totalPages) return;
            this.pagination.page = page;
            this.loadReservations();
        },

        // HUS-06: Crear reserva con validación y manejo de 409
        async submitCreateReservation() {
            this.newError = "";
            this.newSuccess = "";

            if (!this.newForm.serviceId) {
                this.newError = "Por favor selecciona un servicio.";
                return;
            }
            if (!this.newForm.date) {
                this.newError = "Por favor selecciona una fecha válida.";
                return;
            }
            if (!this.newForm.time) {
                this.newError = "Por favor selecciona una hora en formato HH:mm.";
                return;
            }

            this.isSubmittingNew = true;
            const res = await ReservationsApi.createReservation(this.newForm);
            this.isSubmittingNew = false;

            if (res.status === 409) {
                // Validación explícita de traslape requerida en HUS-06
                this.newError = "Ese horario ya está ocupado. Por favor, selecciona otra hora o fecha.";
                return;
            }

            if (!res.ok) {
                this.newError = res.message || "No se pudo agendar la reserva. Intenta de nuevo.";
                return;
            }

            this.newSuccess = res.message || "Reserva agendada exitosamente.";
            this.showNotification("¡Reserva confirmada con éxito!", "success");
            this.loadDashboard(); // Actualizar métricas del dashboard
        },

        resetNewForm() {
            this.newForm = {
                serviceId: "",
                date: "",
                time: "",
                notes: ""
            };
            this.newError = "";
            this.newSuccess = "";
        },

        // HUS-08: Abrir modal y reprogramar reserva
        openRescheduleModal(reservation) {
            if (reservation.status === "cancelled") {
                this.showNotification("No se puede reprogramar una reserva cancelada.", "error");
                return;
            }

            this.rescheduleTarget = reservation;
            const dateStr = reservation.date ? String(reservation.date).slice(0, 10) : "";
            this.rescheduleForm = {
                date: dateStr,
                time: reservation.time || "",
                notes: reservation.notes || ""
            };
            this.rescheduleError = "";
            this.rescheduleSuccess = "";
            this.isRescheduleModalOpen = true;
        },

        closeRescheduleModal() {
            this.isRescheduleModalOpen = false;
            this.rescheduleTarget = null;
            this.rescheduleError = "";
        },

        async submitReschedule() {
            if (!this.rescheduleTarget) return;

            this.rescheduleError = "";
            this.isSubmittingReschedule = true;

            const res = await ReservationsApi.updateReservation(this.rescheduleTarget.id, this.rescheduleForm);
            this.isSubmittingReschedule = false;

            if (res.status === 409) {
                this.rescheduleError = "Ese horario ya está ocupado. Por favor selecciona otra fecha u hora.";
                return;
            }

            if (!res.ok) {
                this.rescheduleError = res.message || "No fue posible reprogramar la reserva.";
                return;
            }

            this.showNotification("Reserva reprogramada exitosamente.", "success");
            this.closeRescheduleModal();
            this.loadReservations();
            this.loadDashboard();
        },

        // HUS-09: Abrir modal de cancelación y confirmar
        openCancelModal(reservation) {
            if (reservation.status === "cancelled") {
                this.showNotification("La reserva ya está cancelada.", "error");
                return;
            }
            this.cancelTarget = reservation;
            this.cancelError = "";
            this.isCancelModalOpen = true;
        },

        closeCancelModal() {
            this.isCancelModalOpen = false;
            this.cancelTarget = null;
            this.cancelError = "";
        },

        async confirmCancelReservation() {
            if (!this.cancelTarget) return;

            this.cancelError = "";
            this.isSubmittingCancel = true;

            const res = await ReservationsApi.cancelReservation(this.cancelTarget.id);
            this.isSubmittingCancel = false;

            if (!res.ok) {
                this.cancelError = res.message || "No se pudo cancelar la reserva.";
                return;
            }

            this.showNotification("Reserva cancelada exitosamente y horario liberado.", "success");
            this.closeCancelModal();
            this.loadReservations();
            this.loadDashboard();
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
            if (!value) return "Fecha pendiente";

            const dateValue = typeof value === "string" ? value.slice(0, 10) : value;
            const date = new Date(`${dateValue}T00:00:00`);
            if (Number.isNaN(date.getTime())) return String(value);

            return new Intl.DateTimeFormat("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(date);
        },

        formatPrice(price) {
            return new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0
            }).format(price || 0);
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
