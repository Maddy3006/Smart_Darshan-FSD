import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', required: true },
    darshanTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: String, required: true }, // temple-local YYYY-MM-DD
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    // Capacities and bookings count people, not tokens (a family of 4 uses 4 seats).
    onlineCapacity: { type: Number, required: true, min: 0 },
    walkinCapacity: { type: Number, required: true, min: 0 },
    onlineBooked: { type: Number, default: 0, min: 0 },
    walkinBooked: { type: Number, default: 0, min: 0 },
    isFestival: { type: Boolean, default: false },
  },
  { timestamps: true },
);

slotSchema.index({ templeId: 1, darshanTypeId: 1, startAt: 1 }, { unique: true });
slotSchema.index({ templeId: 1, date: 1 });
slotSchema.index({ templeId: 1, startAt: 1, endAt: 1 });

export default mongoose.model('Slot', slotSchema);
