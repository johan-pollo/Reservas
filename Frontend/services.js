const { createApp } = Vue;
const API_BASE_URL = "http://localhost:3000";
const PAGE_SIZE = 9;

const Services = {
    data() {
        return {
            token: localStorage.getItem("token"),
            currentUser: null,
            services: [],
            pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
            search: "",
            statusFilter: "",
            categoryFilter: "",
            isLoading: true,
            isSaving: false,
            loadError: "",
            formError: "",
            successMessage: "",
            isModalOpen: false,
            isSidebarOpen: false,
            isUserMenuOpen: false,
            editingServiceId: null,
            form: { name: "", description: "", price: "", durationMinutes: "", imageUrl: "", category: "", status: "active" },
            searchTimer: null
        };
    },
    computed: {
        isEditing() {
            return Boolean(this.editingServiceId);
        },
        isAdmin() {
            return this.currentUser?.role === "admin";
        },
        displayName() {
            return this.currentUser?.name?.trim() || "Usuario";
        },
        displayRole() {
            return this.isAdmin ? "Administrador" : "Usuario";
        },
        userInitials() {
            return this.displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0).toLocaleUpperCase("es"))
                .join("");
        },
        firstVisibleService() {
            return this.pagination.total ? (this.pagination.page - 1) * this.pagination.limit + 1 : 0;
        },
        lastVisibleService() {
            return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
        }
    },
    template: `
        <div class="services-shell">
            <button
                v-if="isSidebarOpen"
                class="services-sidebar-backdrop"
                type="button"
                aria-label="Cerrar menú"
                @click="isSidebarOpen = false"
            ></button>

            <aside class="services-sidebar" :class="{ 'services-sidebar-open': isSidebarOpen }">
                <a class="services-brand" href="./dashboard.html" aria-label="Sistema de Reservas, inicio">
                    <span class="services-brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span>Sistema de Reservas</span>
                </a>

                <p class="services-sidebar-label">MENÚ</p>
                <nav class="services-nav" aria-label="Navegación principal">
                    <a class="services-nav-link" href="./dashboard.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                        </svg>
                        Resumen
                    </a>
                    <a class="services-nav-link services-nav-link-active" href="./services.html" aria-current="page">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 8h16l-1.2 11H5.2L4 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                            <path d="M8 8a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Servicios
                    </a>
                    <a class="services-nav-link" href="./dashboard.html#reservations" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Reservas
                    </a>
                    <a v-if="isAdmin" class="services-nav-link" href="./users.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 4.2a4 4 0 0 1 0 7.6M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Usuarios
                    </a>
                </nav>

                <div class="services-sidebar-bottom">
                    <span class="services-help-icon" aria-hidden="true">?</span>
                    <span>¿Necesitas ayuda?<br><small>Consulta los servicios disponibles.</small></span>
                </div>
            </aside>

            <div class="services-main">
                <header class="services-header">
                    <div class="services-header-leading">
                        <button
                            class="services-mobile-menu"
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
                            <p class="services-header-eyebrow">Sistema de Reservas</p>
                            <p class="services-header-context">{{ isAdmin ? 'Administración' : 'Catálogo' }}</p>
                        </div>
                    </div>

                    <div class="services-menu-wrap">
                        <button
                            class="services-menu-trigger"
                            type="button"
                            :aria-expanded="isUserMenuOpen"
                            aria-haspopup="menu"
                            @click="isUserMenuOpen = !isUserMenuOpen"
                        >
                            <span class="services-avatar">{{ userInitials }}</span>
                            <span class="services-menu-copy">
                                <strong>{{ displayName }}</strong>
                                <small>{{ displayRole }}</small>
                            </span>
                            <span class="services-chevron" aria-hidden="true">⌄</span>
                        </button>
                        <div v-if="isUserMenuOpen" class="services-dropdown" role="menu">
                            <div class="services-dropdown-user">
                                <strong>{{ displayName }}</strong>
                                <span>{{ displayRole }}</span>
                            </div>
                            <button type="button" role="menuitem" @click="logout">Cerrar sesión</button>
                        </div>
                    </div>
                </header>

                <main class="services-content">
                    <section class="services-page-heading">
                        <div>
                            <p class="services-eyebrow">{{ isAdmin ? 'Administración' : 'Catálogo' }}</p>
                            <h1>{{ isAdmin ? 'Gestión de servicios' : 'Servicios disponibles' }}</h1>
                            <p class="services-description">Consulta los servicios, sus precios, duración y disponibilidad.</p>
                        </div>
                        <button v-if="isAdmin" class="services-primary-button" type="button" @click="openCreateModal">
                            <span aria-hidden="true">+</span>
                            Nuevo servicio
                        </button>
                    </section>

                    <p v-if="successMessage" class="services-alert services-alert-success" role="status">
                        {{ successMessage }}
                    </p>
                    <section v-if="loadError" class="services-alert services-alert-error" role="alert">
                        <span>{{ loadError }}</span>
                        <button class="services-inline-button" type="button" @click="loadServices">Reintentar</button>
                    </section>

                    <section class="services-panel" aria-labelledby="services-list-title">
                        <div class="services-panel-heading">
                            <div>
                                <h2 id="services-list-title">{{ isAdmin ? 'Servicios registrados' : 'Explora el catálogo' }}</h2>
                                <p>{{ isAdmin ? 'Mantén al día el catálogo que se utiliza en las reservas.' : 'Solo se muestran servicios actualmente disponibles.' }}</p>
                            </div>
                            <span class="services-total">{{ pagination.total }} {{ pagination.total === 1 ? 'servicio' : 'servicios' }}</span>
                        </div>

                        <div class="services-toolbar">
                            <label class="services-search">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/>
                                    <path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                </svg>
                                <span class="visually-hidden">Buscar servicios</span>
                                <input v-model="search" type="search" placeholder="Buscar por nombre, descripción o categoría" @input="onSearchInput">
                            </label>
                            <label v-if="isAdmin" class="services-category-filter">
                                <span class="visually-hidden">Filtrar por categoría</span>
                                <input v-model="categoryFilter" type="search" maxlength="500" placeholder="Categoría" @input="onCategoryInput">
                            </label>
                            <label class="services-filter">
                                <span class="visually-hidden">Filtrar por estado</span>
                                <select v-model="statusFilter" @change="applyFilters">
                                    <option value="">{{ isAdmin ? 'Todos los estados' : 'Disponibles' }}</option>
                                    <option v-if="isAdmin" value="active">Activo</option>
                                    <option v-if="isAdmin" value="inactive">Inactivo</option>
                                </select>
                            </label>
                        </div>

                        <div v-if="isLoading" class="services-empty-state" role="status">
                            <span class="services-spinner" aria-hidden="true"></span>
                            Cargando servicios...
                        </div>
                        <div v-else-if="!loadError && services.length === 0" class="services-empty-state">
                            <span class="services-empty-icon" aria-hidden="true">◇</span>
                            <strong>No encontramos servicios</strong>
                            <span>{{ isAdmin ? 'Prueba con otra búsqueda o agrega un servicio al catálogo.' : 'Vuelve a consultar más tarde.' }}</span>
                        </div>
                        <div v-else-if="services.length" class="services-grid">
                            <article v-for="service in services" :key="service.id" class="service-card">
                                <div class="service-card-image">
                                    <img
                                        v-if="service.imageUrl"
                                        :src="service.imageUrl"
                                        :alt="'Imagen de ' + service.name"
                                        loading="lazy"
                                        @error="onImageError"
                                    >
                                    <div v-else class="service-image-placeholder" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M4 8h16l-1.2 11H5.2L4 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                                            <path d="M8 8a4 4 0 0 1 8 0M8 13h.01M12 13h.01M16 13h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                        </svg>
                                    </div>
                                    <span class="service-status" :class="service.status === 'active' ? 'service-status-active' : 'service-status-inactive'">
                                        <span aria-hidden="true"></span>
                                        {{ service.status === 'active' ? 'Disponible' : 'Inactivo' }}
                                    </span>
                                </div>
                                <div class="service-card-content">
                                    <div class="service-card-title-row">
                                        <h3>{{ service.name }}</h3>
                                        <span v-if="service.category" class="service-category">{{ service.category }}</span>
                                    </div>
                                    <p class="service-description">{{ service.description || 'Sin descripción disponible.' }}</p>
                                    <div class="service-card-meta">
                                        <span class="service-duration">
                                            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
                                                <path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            {{ service.durationMinutes }} min
                                        </span>
                                        <strong class="service-price">{{ formatPrice(service.price) }}</strong>
                                    </div>
                                    <div v-if="isAdmin" class="service-card-actions">
                                        <button class="service-edit-button" type="button" :aria-label="'Editar ' + service.name" @click="openEditModal(service)">Editar</button>
                                        <button class="service-delete-button" type="button" :aria-label="'Eliminar ' + service.name" @click="deleteService(service)">Eliminar</button>
                                    </div>
                                </div>
                            </article>
                        </div>

                        <footer v-if="pagination.totalPages > 0" class="services-pagination">
                            <span>Mostrando {{ firstVisibleService }}–{{ lastVisibleService }} de {{ pagination.total }}</span>
                            <div class="services-pagination-controls">
                                <button type="button" :disabled="pagination.page <= 1 || isLoading" @click="changePage(pagination.page - 1)">Anterior</button>
                                <span>Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
                                <button type="button" :disabled="pagination.page >= pagination.totalPages || isLoading" @click="changePage(pagination.page + 1)">Siguiente</button>
                            </div>
                        </footer>
                    </section>
                </main>
            </div>

            <div v-if="isModalOpen" class="services-modal-backdrop" @click.self="closeModal">
                <section class="services-modal" role="dialog" aria-modal="true" :aria-labelledby="isEditing ? 'edit-service-title' : 'new-service-title'">
                    <header class="services-modal-header">
                        <div>
                            <p class="services-eyebrow">{{ isEditing ? 'Catálogo' : 'Nuevo elemento' }}</p>
                            <h2 :id="isEditing ? 'edit-service-title' : 'new-service-title'">{{ isEditing ? 'Editar servicio' : 'Crear servicio' }}</h2>
                            <p>{{ isEditing ? 'Actualiza los detalles del servicio.' : 'Completa la información para agregarlo al catálogo.' }}</p>
                        </div>
                        <button class="services-modal-close" type="button" aria-label="Cerrar" @click="closeModal">×</button>
                    </header>

                    <form class="services-form" @submit.prevent="saveService">
                        <label class="services-form-field">
                            <span>Nombre</span>
                            <input v-model="form.name" type="text" maxlength="100" required>
                        </label>
                        <label class="services-form-field">
                            <span>Descripción <small>(opcional)</small></span>
                            <textarea v-model="form.description" maxlength="500" rows="3"></textarea>
                        </label>
                        <div class="services-form-row">
                            <label class="services-form-field">
                                <span>Precio</span>
                                <input v-model="form.price" type="number" min="0" step="any" inputmode="decimal" required>
                            </label>
                            <label class="services-form-field">
                                <span>Duración (minutos)</span>
                                <input v-model="form.durationMinutes" type="number" min="1" step="1" inputmode="numeric" required>
                            </label>
                        </div>
                        <label class="services-form-field">
                            <span>Imagen <small>(URL opcional)</small></span>
                            <input v-model="form.imageUrl" type="text" maxlength="500" placeholder="https://ejemplo.com/imagen.jpg">
                            <small>Agrega una dirección web de imagen; la carga de archivos no está disponible.</small>
                        </label>
                        <label class="services-form-field">
                            <span>Categoría <small>(opcional)</small></span>
                            <input v-model="form.category" type="text" maxlength="500" placeholder="Ej. Bienestar">
                        </label>
                        <label class="services-form-field">
                            <span>Estado</span>
                            <select v-model="form.status" required>
                                <option value="active">Activo / disponible</option>
                                <option value="inactive">Inactivo</option>
                            </select>
                        </label>

                        <p v-if="formError" class="services-alert services-alert-error" role="alert">{{ formError }}</p>
                        <footer class="services-form-actions">
                            <button class="services-secondary-button" type="button" :disabled="isSaving" @click="closeModal">Cancelar</button>
                            <button class="services-primary-button" type="submit" :disabled="isSaving">
                                <span v-if="isSaving" class="services-spinner services-spinner-light" aria-hidden="true"></span>
                                {{ isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear servicio' }}
                            </button>
                        </footer>
                    </form>
                </section>
            </div>
        </div>
    `,
    mounted() {
        if (!this.token) {
            this.logout();
            return;
        }
        document.addEventListener("click", this.handleOutsideClick);
        document.addEventListener("keydown", this.handleKeydown);
        this.initializePage();
    },
    beforeUnmount() {
        document.removeEventListener("click", this.handleOutsideClick);
        document.removeEventListener("keydown", this.handleKeydown);
        window.clearTimeout(this.searchTimer);
    },
    methods: {
        async apiRequest(path, options = {}) {
            let response;
            try {
                response = await fetch(`${API_BASE_URL}${path}`, {
                    ...options,
                    headers: {
                        "Accept": "application/json",
                        "Authorization": `Bearer ${this.token}`,
                        ...(options.body ? { "Content-Type": "application/json" } : {}),
                        ...options.headers
                    }
                });
            } catch {
                throw new Error("No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.");
            }

            let result = null;
            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (response.status === 401) {
                this.logout();
                throw new Error("La sesión expiró. Inicia sesión de nuevo.");
            }
            if (response.status === 403) {
                throw new Error("No tienes permisos de administrador para realizar esta acción.");
            }
            if (!response.ok) {
                throw new Error(result?.message || "No fue posible completar la solicitud.");
            }
            return result;
        },
        async initializePage() {
            try {
                const dashboard = await this.apiRequest("/api/dashboard/stats");
                this.currentUser = dashboard.user;
                if (!this.currentUser) {
                    throw new Error("El servidor respondió sin la información de la sesión.");
                }
                await this.loadServices();
            } catch (error) {
                this.loadError = error.message;
                this.isLoading = false;
            }
        },
        async loadServices() {
            this.isLoading = true;
            this.loadError = "";
            const params = new URLSearchParams({
                page: String(this.pagination.page),
                limit: String(PAGE_SIZE)
            });
            if (this.search.trim()) params.set("search", this.search.trim());
            if (this.statusFilter) {
                params.set("status", this.statusFilter);
            } else if (!this.isAdmin) {
                params.set("status", "active");
            }
            if (this.categoryFilter.trim()) params.set("category", this.categoryFilter.trim());

            try {
                const result = await this.apiRequest(`/api/services?${params.toString()}`);
                if (!result || !Array.isArray(result.services) || !result.pagination) {
                    throw new Error("El servidor respondió con un catálogo de servicios no válido.");
                }
                this.services = result.services;
                this.pagination = result.pagination;
            } catch (error) {
                this.services = [];
                this.loadError = error.message;
            } finally {
                this.isLoading = false;
            }
        },
        onSearchInput() {
            window.clearTimeout(this.searchTimer);
            this.searchTimer = window.setTimeout(() => {
                this.pagination.page = 1;
                this.loadServices();
            }, 300);
        },
        onCategoryInput() {
            this.onSearchInput();
        },
        applyFilters() {
            this.pagination.page = 1;
            this.loadServices();
        },
        changePage(page) {
            this.pagination.page = page;
            this.loadServices();
        },
        emptyForm() {
            return { name: "", description: "", price: "", durationMinutes: "", imageUrl: "", category: "", status: "active" };
        },
        openCreateModal() {
            this.editingServiceId = null;
            this.form = this.emptyForm();
            this.formError = "";
            this.isModalOpen = true;
            this.$nextTick(() => document.querySelector(".services-modal input")?.focus());
        },
        openEditModal(service) {
            this.editingServiceId = service.id;
            this.form = {
                name: service.name || "",
                description: service.description || "",
                price: String(service.price),
                durationMinutes: String(service.durationMinutes),
                imageUrl: service.imageUrl || "",
                category: service.category || "",
                status: service.status
            };
            this.formError = "";
            this.isModalOpen = true;
            this.$nextTick(() => document.querySelector(".services-modal input")?.focus());
        },
        closeModal() {
            if (this.isSaving) return;
            this.isModalOpen = false;
            this.formError = "";
        },
        validateForm() {
            const name = this.form.name.trim();
            if (!name || name.length > 100) return "El nombre es obligatorio y no debe superar 100 caracteres.";
            const price = Number(this.form.price);
            if (this.form.price === "" || !Number.isFinite(price) || price < 0) return "El precio debe ser un número mayor o igual a cero.";
            const duration = Number(this.form.durationMinutes);
            if (!Number.isInteger(duration) || duration < 1) return "La duración debe ser un número entero de minutos mayor que cero.";
            for (const [label, value] of [["descripción", this.form.description], ["imagen", this.form.imageUrl], ["categoría", this.form.category]]) {
                if (value.length > 500) return `El campo ${label} no puede superar 500 caracteres.`;
            }
            if (!["active", "inactive"].includes(this.form.status)) return "Selecciona un estado válido.";
            return "";
        },
        async saveService() {
            this.formError = this.validateForm();
            if (this.formError) return;

            this.isSaving = true;
            const editing = this.isEditing;
            const payload = {
                name: this.form.name.trim(),
                description: this.form.description.trim(),
                price: Number(this.form.price),
                durationMinutes: Number(this.form.durationMinutes),
                imageUrl: this.form.imageUrl.trim(),
                category: this.form.category.trim(),
                status: this.form.status
            };

            try {
                const result = await this.apiRequest(
                    editing ? `/api/services/${encodeURIComponent(this.editingServiceId)}` : "/api/services",
                    {
                        method: editing ? "PUT" : "POST",
                        body: JSON.stringify(payload)
                    }
                );
                this.successMessage = result?.message || (editing ? "Servicio actualizado correctamente." : "Servicio creado correctamente.");
                this.isModalOpen = false;
                this.pagination.page = editing ? this.pagination.page : 1;
                await this.loadServices();
            } catch (error) {
                this.formError = error.message;
            } finally {
                this.isSaving = false;
            }
        },
        async deleteService(service) {
            const confirmed = window.confirm(`¿Eliminar “${service.name}” de forma permanente? Esta acción no se puede deshacer.`);
            if (!confirmed) return;

            this.successMessage = "";
            this.loadError = "";
            try {
                const result = await this.apiRequest(`/api/services/${encodeURIComponent(service.id)}`, {
                    method: "DELETE"
                });
                this.successMessage = result?.message || "Servicio eliminado correctamente.";
                await this.loadServices();
            } catch (error) {
                this.loadError = error.message;
            }
        },
        formatPrice(value) {
            const price = Number(value);
            if (!Number.isFinite(price)) return "Precio no disponible";
            return new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 2
            }).format(price);
        },
        onImageError(event) {
            event.target.hidden = true;
        },
        logout() {
            localStorage.removeItem("token");
            window.location.replace("./index.html");
        },
        handleOutsideClick(event) {
            if (!event.target.closest(".services-menu-wrap")) this.isUserMenuOpen = false;
        },
        handleKeydown(event) {
            if (event.key === "Escape") {
                if (this.isModalOpen) this.closeModal();
                this.isSidebarOpen = false;
                this.isUserMenuOpen = false;
            }
        }
    }
};

createApp(Services).mount("#app");
