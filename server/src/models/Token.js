import mongoose from 'mongoose';

export const TOKEN_STATUSES = ['booked', 'checked_in', 'completed', 'cancelled', 'expired'];
export const ACTIVE_STATUSES = ['booked', 'checked_in', 'completed'];

const { ObjectId } = mongoose.Schema.Types;

const tokenSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    templeId: { type: ObjectId, ref: 'Temple', required: true },
    slotId: { type: ObjectId, ref: 'Slot', required: true },
    darshanTypeId: { type: ObjectId, required: true },
    darshanTypeName: { type: String, required: true },
    userId: { type: ObjectId, ref: 'User' }, // empty for walk-ins
    source: { type: String, enum: ['online', 'walkin'], required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    groupSize: { type: Number, required: true, min: 1 },
    status: { type: String, enum: TOKEN_STATUSES, default: 'booked' },
    // Copied from the slot so queue and reminder queries need no join.
    slotDate: { type: String, required: true },
    slotStartAt: { type: Date, required: true },
    slotEndAt: { type: Date, required: true },
    checkedInAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    expiredAt: Date,
    autoCompleted: { type: Boolean, default: false },
    reminderSentAt: Date,
    issuedBy: { type: ObjectId, ref: 'User' },
    checkedInBy: { type: ObjectId, ref: 'User' },
    completedBy: { type: ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

tokenSchema.index({ templeId: 1, status: 1, darshanTypeId: 1, checkedInAt: 1 });
tokenSchema.index({ templeId: 1, completedAt: 1 });
tokenSchema.index({ templeId: 1, slotDate: 1 });
tokenSchema.index({ userId: 1, slotStartAt: -1 });
tokenSchema.index({ status: 1, slotStartAt: 1 });

export default mongoose.model('Token', tokenSchema);
