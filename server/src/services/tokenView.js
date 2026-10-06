import { maskName } from '../utils/helpers.js';

const MINUTE = 60_000;

/**
 * Shapes a token for API responses. `full` includes the devotee's name and phone
 * (owner, staff, admins); otherwise the name is masked for the public status page.
 */
export function serializeToken(token, temple, { full = false } = {}) {
  const t = token.toObject ? token.toObject() : token;
  const settings = temple.settings;
  return {
    _id: t._id,
    code: t.code,
    status: t.status,
    source: t.source,
    name: full ? t.name : maskName(t.name),
    phone: full ? t.phone : undefined,
    groupSize: t.groupSize,
    darshanType: {
      _id: t.darshanTypeId,
      name: t.darshanTypeName,
      isPriority: Boolean(temple.darshanTypes.id?.(t.darshanTypeId)?.isPriority),
    },
    temple: {
      _id: temple._id,
      name: temple.name,
      slug: temple.slug,
      city: temple.city,
      timezone: temple.timezone,
    },
    slot: { _id: t.slotId, date: t.slotDate, startAt: t.slotStartAt, endAt: t.slotEndAt },
    entryWindow: {
      opensAt: new Date(new Date(t.slotStartAt).getTime() - settings.checkinEarlyMin * MINUTE),
      closesAt: new Date(new Date(t.slotEndAt).getTime() + settings.checkinLateMin * MINUTE),
    },
    checkedInAt: t.checkedInAt,
    completedAt: t.completedAt,
    cancelledAt: t.cancelledAt,
    expiredAt: t.expiredAt,
    autoCompleted: t.autoCompleted,
    createdAt: t.createdAt,
    canCancel: t.status === 'booked' && new Date(t.slotStartAt) > new Date(),
  };
}
