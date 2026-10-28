const { createApp } = Vue;
const API_BASE_URL = "http://localhost:3000";
const PAGE_SIZE = 10;

const Users = {
    data() {
        return {
            token: localStorage.getItem("token"),
            currentUser: null,
            users: [],
            pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
            search: "",
            roleFilter: "",
            statusFilter: "",
            isLoading: true,
            isSaving: false,
            loadError: "",
            formError: "",
            successMessage: "",
            isModalOpen: false,
            isSidebarOpen: false,
            isUserMenuOpen: false,
            editingUserId: null,
            form: { name: "", email: "", phone: "", password: "", role: "user", isActive: true },
            searchTimer: null
        };
    },
    computed: {
        isEditing() {
            return Boolean(this.editingUserId);
        },
        displayName() {
            return this.currentUser?.name?.trim() || "Usuario";
        },
        displayRole() {
            return this.currentUser?.role === "admin" ? "Administrador" : "Usuario";
        },
        userInitials() {
            return this.displayName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part.charAt(0).toLocaleUpperCase("es"))
                .join("");
        },
        firstVisibleUser() {
            return this.pagination.total ? (this.pagination.page - 1) * this.pagination.limit + 1 : 0;
        },
        lastVisibleUser() {
            return Math.min(this.pagination.page * this.pagination.limit, this.pagination.total);
        }
    },
    template: `
        <div class="users-shell">
            <button
                v-if="isSidebarOpen"
                class="users-sidebar-backdrop"
                type="button"
                aria-label="Cerrar menú"
                @click="isSidebarOpen = false"
            ></button>

            <aside class="users-sidebar" :class="{ 'users-sidebar-open': isSidebarOpen }">
                <a class="users-brand" href="./dashboard.html" aria-label="Sistema de Reservas, inicio">
                    <span class="users-brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M4 10.5 12 4l8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                            <path d="M9 20v-6h6v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <span>Sistema de Reservas</span>
                </a>

                <p class="users-sidebar-label">MENÚ</p>
                <nav class="users-nav" aria-label="Navegación principal">
                    <a class="users-nav-link" href="./dashboard.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.7"/>
                        </svg>
                        Resumen
                    </a>
                    <a class="users-nav-link" href="./services.html" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M4 8h16l-1.2 11H5.2L4 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
                            <path d="M8 8a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Servicios
                    </a>
                    <a class="users-nav-link" href="./dashboard.html#reservations" @click="isSidebarOpen = false">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" stroke-width="1.7"/>
                            <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h3M8 16h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Reservas
                    </a>
                    <a v-if="currentUser?.role === 'admin'" class="users-nav-link users-nav-link-active" href="./users.html" aria-current="page">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 4.2a4 4 0 0 1 0 7.6M17 15h1.5a3.5 3.5 0 0 1 3.5 3.5V20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                        </svg>
                        Usuarios
                    </a>
                </nav>

                <div class="users-sidebar-bottom">
                    <span class="users-help-icon" aria-hidden="true">?</span>
                    <span>¿Necesitas ayuda?<br><small>Administra las cuentas del sistema.</small></span>
                </div>
            </aside>

            <div class="users-main">
                <header class="users-header">
                    <div class="users-header-leading">
                        <button
                            class="users-mobile-menu"
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
                            <p class="users-header-eyebrow">Sistema de Reservas</p>
                            <p class="users-header-context">Administración</p>
                        </div>
                    </div>

                    <div class="users-menu-wrap">
                        <button
                            class="users-menu-trigger"
                            type="button"
                            :aria-expanded="isUserMenuOpen"
                            aria-haspopup="menu"
                            @click="isUserMenuOpen = !isUserMenuOpen"
                        >
                            <span class="users-avatar">{{ userInitials }}</span>
                            <span class="users-menu-copy">
                                <strong>{{ displayName }}</strong>
                                <small>{{ displayRole }}</small>
                            </span>
                            <span class="users-chevron" aria-hidden="true">⌄</span>
                        </button>
                        <div v-if="isUserMenuOpen" class="users-dropdown" role="menu">
                            <div class="users-dropdown-user">
                                <strong>{{ displayName }}</strong>
                                <span>{{ displayRole }}</span>
                            </div>
                            <button type="button" role="menuitem" @click="logout">Cerrar sesión</button>
                        </div>
                    </div>
                </header>

                <main class="users-content">
                    <section class="users-page-heading">
                        <div>
                            <p class="users-eyebrow">Administración</p>
                            <h1>Gestión de usuarios</h1>
                            <p class="users-description">Consulta y mantén actualizadas las cuentas del sistema.</p>
                        </div>
                        <button v-if="currentUser?.role === 'admin'" class="users-primary-button" type="button" @click="openCreateModal">
                            <span aria-hidden="true">+</span>
                            Nuevo usuario
                        </button>
                    </section>

                    <p v-if="successMessage" class="users-alert users-alert-success" role="status">
                        {{ successMessage }}
                    </p>
                    <section v-if="loadError" class="users-alert users-alert-error" role="alert">
                        <span>{{ loadError }}</span>
                        <button class="users-inline-button" type="button" @click="loadUsers">Reintentar</button>
                    </section>

                    <section v-if="currentUser?.role === 'admin'" class="users-panel" aria-labelledby="users-list-title">
                        <div class="users-panel-heading">
                            <div>
                                <h2 id="users-list-title">Usuarios registrados</h2>
                                <p>Busca, filtra y administra los permisos de acceso.</p>
                            </div>
                            <span class="users-total">{{ pagination.total }} {{ pagination.total === 1 ? 'usuario' : 'usuarios' }}</span>
                        </div>

                        <div class="users-toolbar">
                            <label class="users-search">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.7"/>
                                    <path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                                </svg>
                                <span class="visually-hidden">Buscar por nombre o correo</span>
                                <input
                                    v-model="search"
                                    type="search"
                                    placeholder="Buscar nombre o correo"
                                    @input="onSearchInput"
                                >
                            </label>
                            <label class="users-filter">
                                <span class="visually-hidden">Filtrar por rol</span>
                                <select v-model="roleFilter" @change="applyFilters">
                                    <option value="">Todos los roles</option>
                                    <option value="admin">Administrador</option>
                                    <option value="user">Usuario</option>
                                </select>
                            </label>
                            <label class="users-filter">
                                <span class="visually-hidden">Filtrar por estado</span>
                                <select v-model="statusFilter" @change="applyFilters">
                                    <option value="">Todos los estados</option>
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                            </label>
                        </div>

                        <div v-if="isLoading" class="users-empty-state" role="status">
                            <span class="users-spinner" aria-hidden="true"></span>
                            Cargando usuarios...
                        </div>
                        <div v-else-if="!loadError && users.length === 0" class="users-empty-state">
                            <span class="users-empty-icon" aria-hidden="true">◎</span>
                            <strong>No encontramos usuarios</strong>
                            <span>Prueba con otra búsqueda o crea una nueva cuenta.</span>
                        </div>
                        <div v-else-if="users.length" class="users-table-scroll">
                            <table class="users-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Usuario</th>
                                        <th scope="col">Rol</th>
                                        <th scope="col">Estado</th>
                                        <th scope="col">Fecha de registro</th>
                                        <th scope="col"><span class="visually-hidden">Acciones</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="user in users" :key="user.id">
                                        <td>
                                            <div class="users-person">
                                                <span class="users-person-avatar">{{ initials(user.name, user.email) }}</span>
                                                <span class="users-person-copy">
                                                    <strong>{{ user.name || 'Sin nombre' }}</strong>
                                                    <small>{{ user.email }}</small>
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="users-role-badge" :class="user.role === 'admin' ? 'users-role-admin' : 'users-role-user'">
                                                {{ user.role === 'admin' ? 'Administrador' : 'Usuario' }}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="users-status" :class="user.isActive ? 'users-status-active' : 'users-status-inactive'">
                                                <span aria-hidden="true"></span>
                                                {{ user.isActive ? 'Activo' : 'Inactivo' }}
                                            </span>
                                        </td>
                                        <td class="users-date">{{ formatDate(user.createdAt) }}</td>
                                        <td>
                                            <div class="users-row-actions">
                                                <button class="users-action-button" type="button" :aria-label="'Editar ' + user.name" @click="openEditModal(user)">
                                                    Editar
                                                </button>
                                                <button
                                                    v-if="user.isActive"
                                                    class="users-action-button users-action-danger"
                                                    type="button"
                                                    :disabled="user.id === currentUser?.id"
                                                    :aria-label="'Desactivar ' + user.name"
                                                    @click="deactivateUser(user)"
                                                >
                                                    Desactivar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <footer v-if="pagination.totalPages > 0" class="users-pagination">
                            <span>Mostrando {{ firstVisibleUser }}–{{ lastVisibleUser }} de {{ pagination.total }}</span>
                            <div class="users-pagination-controls">
                                <button type="button" :disabled="pagination.page <= 1 || isLoading" @click="changePage(pagination.page - 1)">
                                    Anterior
                                </button>
                                <span>Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
                                <button type="button" :disabled="pagination.page >= pagination.totalPages || isLoading" @click="changePage(pagination.page + 1)">
                                    Siguiente
                                </button>
                            </div>
                        </footer>
                    </section>
                </main>
            </div>

            <div v-if="isModalOpen" class="users-modal-backdrop" @click.self="closeModal">
                <section class="users-modal" role="dialog" aria-modal="true" :aria-labelledby="isEditing ? 'edit-user-title' : 'new-user-title'">
                    <header class="users-modal-header">
                        <div>
                            <p class="users-eyebrow">{{ isEditing ? 'Perfil de usuario' : 'Nueva cuenta' }}</p>
                            <h2 :id="isEditing ? 'edit-user-title' : 'new-user-title'">{{ isEditing ? 'Editar usuario' : 'Crear usuario' }}</h2>
                            <p>{{ isEditing ? 'Actualiza la información y el acceso a la cuenta.' : 'Completa los datos para agregar una cuenta al sistema.' }}</p>
                        </div>
                        <button class="users-modal-close" type="button" aria-label="Cerrar" @click="closeModal">×</button>
                    </header>

                    <form class="users-form" @submit.prevent="saveUser">
                        <label class="users-form-field">
                            <span>Nombre completo</span>
                            <input v-model="form.name" type="text" autocomplete="name" maxlength="100" required>
                        </label>
                        <label class="users-form-field">
                            <span>Correo electrónico</span>
                            <input v-model="form.email" type="email" autocomplete="email" maxlength="254" required>
                        </label>
                        <label class="users-form-field">
                            <span>Teléfono <small>(opcional)</small></span>
                            <input v-model="form.phone" type="tel" autocomplete="tel" maxlength="30" placeholder="+57 300 123 4567">
                        </label>
                        <label v-if="!isEditing" class="users-form-field">
                            <span>Contraseña temporal</span>
                            <input v-model="form.password" type="password" autocomplete="new-password" required minlength="8">
                            <small>Usa 8 caracteres o más, incluyendo mayúscula, minúscula, número y símbolo.</small>
                        </label>
                        <label class="users-form-field">
                            <span>Rol</span>
                            <select v-model="form.role">
                                <option value="user" :disabled="isEditing && editingUserId === currentUser?.id">Usuario</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </label>
                        <label class="users-checkbox-field">
                            <input v-model="form.isActive" type="checkbox" :disabled="isEditing && editingUserId === currentUser?.id">
                            <span>Cuenta activa</span>
                        </label>

                        <p v-if="formError" class="users-alert users-alert-error" role="alert">{{ formError }}</p>
                        <footer class="users-form-actions">
                            <button class="users-secondary-button" type="button" :disabled="isSaving" @click="closeModal">Cancelar</button>
                            <button class="users-primary-button" type="submit" :disabled="isSaving">
                                <span v-if="isSaving" class="users-spinner users-spinner-light" aria-hidden="true"></span>
                                {{ isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario' }}
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
        emptyForm() {
            return { name: "", email: "", phone: "", password: "", role: "user", isActive: true };
        },
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
                throw new Error("No tienes permisos de administrador para gestionar usuarios.");
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
                if (this.currentUser?.role !== "admin") {
                    this.loadError = "Esta sección está disponible únicamente para administradores.";
                    this.isLoading = false;
                    return;
                }
                await this.loadUsers();
            } catch (error) {
                this.loadError = error.message;
                this.isLoading = false;
            }
        },
        async loadUsers() {
            this.isLoading = true;
            this.loadError = "";
            const params = new URLSearchParams({
                page: String(this.pagination.page),
                limit: String(PAGE_SIZE)
            });
            if (this.search.trim()) params.set("search", this.search.trim());
            if (this.roleFilter) params.set("role", this.roleFilter);
            if (this.statusFilter) params.set("status", this.statusFilter);

            try {
                const result = await this.apiRequest(`/api/users?${params.toString()}`);
                if (!result || !Array.isArray(result.users) || !result.pagination) {
                    throw new Error("El servidor respondió con un listado de usuarios no válido.");
                }
                this.users = result.users;
                this.pagination = result.pagination;
            } catch (error) {
                this.users = [];
                this.loadError = error.message;
            } finally {
                this.isLoading = false;
            }
        },
        onSearchInput() {
            window.clearTimeout(this.searchTimer);
            this.searchTimer = window.setTimeout(() => {
                this.pagination.page = 1;
                this.loadUsers();
            }, 300);
        },
        applyFilters() {
            this.pagination.page = 1;
            this.loadUsers();
        },
        changePage(page) {
            this.pagination.page = page;
            this.loadUsers();
        },
        openCreateModal() {
            this.editingUserId = null;
            this.form = this.emptyForm();
            this.formError = "";
            this.isModalOpen = true;
            this.$nextTick(() => document.querySelector(".users-modal input")?.focus());
        },
        openEditModal(user) {
            this.editingUserId = user.id;
            this.form = {
                name: user.name || "",
                email: user.email,
                phone: user.phone || "",
                password: "",
                role: user.role,
                isActive: user.isActive
            };
            this.formError = "";
            this.isModalOpen = true;
            this.$nextTick(() => document.querySelector(".users-modal input")?.focus());
        },
        closeModal() {
            if (this.isSaving) return;
            this.isModalOpen = false;
            this.formError = "";
        },
        async saveUser() {
            this.isSaving = true;
            this.formError = "";
            const payload = {
                name: this.form.name.trim(),
                email: this.form.email.trim(),
                phone: this.form.phone.trim(),
                role: this.form.role,
                isActive: this.form.isActive
            };

            const editing = this.isEditing;
            if (!editing) payload.password = this.form.password;

            try {
                const result = await this.apiRequest(
                    editing ? `/api/users/${encodeURIComponent(this.editingUserId)}` : "/api/users",
                    {
                        method: editing ? "PUT" : "POST",
                        body: JSON.stringify(payload)
                    }
                );
                this.successMessage = result?.message || (editing ? "Usuario actualizado." : "Usuario creado.");
                this.isModalOpen = false;
                this.pagination.page = editing ? this.pagination.page : 1;
                await this.loadUsers();
            } catch (error) {
                this.formError = error.message;
            } finally {
                this.isSaving = false;
            }
        },
        async deactivateUser(user) {
            const confirmed = window.confirm(`¿Deseas desactivar la cuenta de ${user.name || user.email}? Podrá conservarse su historial, pero ya no podrá iniciar sesión.`);
            if (!confirmed) return;

            this.successMessage = "";
            this.loadError = "";
            try {
                const result = await this.apiRequest(`/api/users/${encodeURIComponent(user.id)}`, {
                    method: "DELETE"
                });
                this.successMessage = result?.message || "Usuario desactivado correctamente.";
                await this.loadUsers();
            } catch (error) {
                this.loadError = error.message;
            }
        },
        initials(name, email) {
            const source = name?.trim() || email || "U";
            return source
                .split(/[\s@._-]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toLocaleUpperCase("es"))
                .join("");
        },
        formatDate(value) {
            if (!value) return "—";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "—";
            return new Intl.DateTimeFormat("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric"
            }).format(date);
        },
        logout() {
            localStorage.removeItem("token");
            window.location.replace("./index.html");
        },
        handleOutsideClick(event) {
            if (!event.target.closest(".users-menu-wrap")) this.isUserMenuOpen = false;
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

createApp(Users).mount("#app");
