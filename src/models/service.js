const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 1 },
    imageUrl: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true, collection: 'services' }
);

serviceSchema.index({ status: 1, category: 1 });

module.exports = mongoose.models.Service || mongoose.model('Service', serviceSchema);