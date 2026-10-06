import mongoose from 'mongoose';

/** Crowd alerts raised for temple admins (e.g. queue nearing capacity). */
const alertSchema = new mongoose.Schema(
  {
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', required: true },
    level: { type: String, enum: ['info', 'warning', 'critical'], required: true },
    message: { type: String, required: true },
    occupancyPct: Number,
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

alertSchema.index({ templeId: 1, createdAt: -1 });

export default mongoose.model('Alert', alertSchema);
