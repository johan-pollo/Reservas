const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    passwordHash: { type: String, required: true, select: false },
    legacyUserId: { type: mongoose.Schema.Types.ObjectId, default: null },
    role: { type: String, default: 'user', trim: true },
    isActive: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null }
  },
  { timestamps: true, collection: 'users' }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);