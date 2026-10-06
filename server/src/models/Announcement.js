import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    templeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', required: true },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    type: { type: String, enum: ['info', 'warning', 'urgent'], default: 'info' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

announcementSchema.index({ templeId: 1, isActive: 1, createdAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
