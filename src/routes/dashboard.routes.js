const express = require('express');
const { createAuthenticateMiddleware } = require('../middleware/authenticate');

const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
const RECENT_RESERVATIONS_LIMIT = 5;

function createDashboardRouter({ User, Service, Reservation, jwtSecret }) {
  const router = express.Router();
  router.use(createAuthenticateMiddleware({ User, jwtSecret }));

  router.get('/stats', async (req, res, next) => {
    try {
      const isAdmin = req.authUser.role === 'admin';
      const reservationFilter = isAdmin ? {} : { userId: req.authUser._id };
      const userCountQuery = isAdmin ? User.countDocuments() : Promise.resolve(null);
      const serviceCountQuery = Service.countDocuments();
      const activeServiceCountQuery = Service.countDocuments({ status: 'active' });
      const reservationCountQueries = [
        Reservation.countDocuments(reservationFilter),
        ...RESERVATION_STATUSES.map((status) =>
          Reservation.countDocuments({ ...reservationFilter, status })
        )
      ];
      const recentReservationsQuery = Reservation.find(reservationFilter)
        .sort({ createdAt: -1 })
        .limit(RECENT_RESERVATIONS_LIMIT)
        .select('date time status notes userId serviceId');

      const [
        users,
        services,
        activeServices,
        ...reservationCounts
      ] = await Promise.all([
        userCountQuery,
        serviceCountQuery,
        activeServiceCountQuery,
        ...reservationCountQueries,
        recentReservationsQuery
      ]);
      const recentReservations = reservationCounts.pop();

      return res.status(200).json({
        user: {
          id: String(req.authUser._id),
          name: req.authUser.name || '',
          role: req.authUser.role || 'user'
        },
        stats: {
          users,
          services: { total: services, active: activeServices },
          reservations: {
            total: reservationCounts[0],
            pending: reservationCounts[1],
            confirmed: reservationCounts[2],
            cancelled: reservationCounts[3],
            completed: reservationCounts[4]
          }
        },
        recentReservations: recentReservations.map((reservation) => ({
          id: String(reservation._id),
          date: reservation.date,
          time: reservation.time,
          status: reservation.status,
          notes: reservation.notes || '',
          userId: String(reservation.userId),
          serviceId: String(reservation.serviceId)
        }))
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createDashboardRouter };
