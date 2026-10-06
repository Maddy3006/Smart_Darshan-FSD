import mongoose from 'mongoose';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const darshanTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  price: { type: Number, default: 0, min: 0 },
  slotMinutes: { type: Number, default: 30, min: 10, max: 240 },
  capacityPerSlot: { type: Number, default: 200, min: 1 },
  // Share of each slot's capacity held back for walk-in devotees.
  walkinPercent: { type: Number, default: 40, min: 0, max: 100 },
  // Senior citizen / differently-abled lane.
  isPriority: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
});

const templeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    deity: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: '' },
    imageUrl: { type: String, trim: true, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    openTime: { type: String, default: '05:00', match: TIME_REGEX },
    closeTime: { type: String, default: '21:00', match: TIME_REGEX },
    darshanTypes: [darshanTypeSchema],
    settings: {
      maxOccupancy: { type: Number, default: 800, min: 1 },
      bookingWindowDays: { type: Number, default: 7, min: 1, max: 30 },
      maxGroupSize: { type: Number, default: 6, min: 1, max: 20 },
      maxBookingsPerUserPerDay: { type: Number, default: 2, min: 1 },
      checkinEarlyMin: { type: Number, default: 15, min: 0 },
      checkinLateMin: { type: Number, default: 30, min: 0 },
      // Unbooked online seats open up to walk-ins this many minutes before a slot starts.
      walkinReleaseMin: { type: Number, default: 60, min: 0 },
      // Devotees never scanned at the exit are marked completed after this long.
      autoCompleteAfterMin: { type: Number, default: 180, min: 30 },
      reminderBeforeMin: { type: Number, default: 30, min: 5 },
      festivalCapacityMultiplier: { type: Number, default: 1.5, min: 1, max: 5 },
      autoPauseAtCapacity: { type: Boolean, default: false },
    },
    controls: {
      entryPaused: { type: Boolean, default: false },
      pauseReason: { type: String, default: '' },
      pausedAt: Date,
    },
    festivals: [
      {
        name: { type: String, required: true, trim: true },
        date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
      },
    ],
    mlModel: {
      trainedAt: Date,
      algorithm: String,
      samples: Number,
      testSamples: Number,
      mae: Number,
      r2: Number,
      // Error of a simple "average for this weekday and hour" guess, for comparison.
      baselineMae: Number,
      improvementPct: Number,
      featureImportances: { type: mongoose.Schema.Types.Mixed },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

templeSchema.methods.isFestivalDate = function isFestivalDate(dateStr) {
  return this.festivals.some((f) => f.date === dateStr);
};

templeSchema.methods.festivalName = function festivalName(dateStr) {
  return this.festivals.find((f) => f.date === dateStr)?.name || null;
};

/** Fields any visitor may see. */
templeSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    name: this.name,
    slug: this.slug,
    deity: this.deity,
    description: this.description,
    address: this.address,
    city: this.city,
    state: this.state,
    imageUrl: this.imageUrl,
    timezone: this.timezone,
    openTime: this.openTime,
    closeTime: this.closeTime,
    darshanTypes: this.darshanTypes
      .filter((d) => d.active)
      .map((d) => ({
        _id: d._id,
        name: d.name,
        description: d.description,
        price: d.price,
        slotMinutes: d.slotMinutes,
        capacityPerSlot: d.capacityPerSlot,
        isPriority: d.isPriority,
      })),
    settings: {
      bookingWindowDays: this.settings.bookingWindowDays,
      maxGroupSize: this.settings.maxGroupSize,
      maxBookingsPerUserPerDay: this.settings.maxBookingsPerUserPerDay,
      checkinEarlyMin: this.settings.checkinEarlyMin,
      checkinLateMin: this.settings.checkinLateMin,
    },
    festivals: this.festivals,
    isActive: this.isActive,
  };
};

export default mongoose.model('Temple', templeSchema);
