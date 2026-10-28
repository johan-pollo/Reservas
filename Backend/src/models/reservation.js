const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    date: { type: Date, required: true },
    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm.']
    },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending'
    }
  },
  { timestamps: true, collection: 'reservations' }
);

reservationSchema.index({ userId: 1, date: 1 });
reservationSchema.index({ serviceId: 1, date: 1, time: 1, status: 1 });

module.exports = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);