import mongoose from 'mongoose';

/** Hourly entry/exit counts per temple — the history the prediction model learns from. */
const footfallLogSchema = new mongoose.Schema(
  {
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', required: true },
    date: { type: String, required: true }, // temple-local YYYY-MM-DD
    hour: { type: Number, required: true, min: 0, max: 23 },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isFestival: { type: Boolean, default: false },
    entries: { type: Number, default: 0 },
    exits: { type: Number, default: 0 },
  },
  { timestamps: true },
);

footfallLogSchema.index({ templeId: 1, date: 1, hour: 1 }, { unique: true });

export default mongoose.model('FootfallLog', footfallLogSchema);
