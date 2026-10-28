/**
 * Servicio API de Reservas y Servicios para el Frontend
 * Conecta con el backend bajo /api/reservations y /api/services con JWT
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ReservationsApi = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    const getBaseUrl = () => {
        if (typeof window !== 'undefined' && window.API_BASE_URL) {
            return window.API_BASE_URL;
        }
        if (typeof globalThis !== 'undefined' && globalThis.API_BASE_URL) {
            return globalThis.API_BASE_URL;
        }
        return 'http://localhost:3000';
    };

    const getToken = () => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('token') || '';
        }
        return '';
    };

    async function request(endpoint, options = {}) {
        const url = `${getBaseUrl()}${endpoint}`;
        const token = options.token !== undefined ? options.token : getToken();

        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            let data = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch {
                    data = null;
                }
            }

            if (response.status === 401) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('token');
                }
                if (typeof window !== 'undefined' && !options.skipRedirect) {
                    window.location.replace('./index.html');
                }
            }

            return {
                ok: response.ok,
                status: response.status,
                data,
                message: data?.message || (response.ok ? 'Operación exitosa' : 'Ocurrió un error en el servidor')
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                data: null,
                message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
            };
        }
    }

    return {
        // HUS-06: Crear reserva
        async createReservation({ serviceId, date, time, notes }) {
            return request('/api/reservations', {
                method: 'POST',
                body: { serviceId, date, time, notes }
            });
        },

        // HUS-07: Listar reservas con filtros y paginación
        async getReservations({ page = 1, limit = 10, status = '', startDate = '', endDate = '' } = {}) {
            const params = new URLSearchParams();
            if (page) params.append('page', page);
            if (limit) params.append('limit', limit);
            if (status) params.append('status', status);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const queryString = params.toString();
            const endpoint = `/api/reservations${queryString ? `?${queryString}` : ''}`;
            return request(endpoint, { method: 'GET' });
        },

        // HUS-08: Reprogramar fecha y hora
        async updateReservation(id, { date, time, notes }) {
            return request(`/api/reservations/${id}`, {
                method: 'PUT',
                body: { date, time, notes }
            });
        },

        // HUS-09: Cancelar reserva y liberar horario
        async cancelReservation(id) {
            return request(`/api/reservations/${id}/cancel`, {
                method: 'PATCH'
            });
        },

        // Listar catálogo de servicios disponibles para reservar
        async getServices({ page = 1, limit = 100, status = 'active' } = {}) {
            const params = new URLSearchParams();
            if (page) params.append('page', page);
            if (limit) params.append('limit', limit);
            if (status) params.append('status', status);

            const queryString = params.toString();
            return request(`/api/services${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
        },

        // Métricas del dashboard
        async getDashboardStats() {
            return request('/api/dashboard/stats', { method: 'GET' });
        }
    };
});
