import { Accessibility, CalendarDays, Clock, Landmark, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fmtDateStr, fmtSlot, fmtTime } from '../lib/format.js';
import { TokenStatusBadge } from './StatusBadge.jsx';
import { Badge, cx } from './ui.jsx';

export function tokenUrl(code) {
  return `${window.location.origin}/t/${code}`;
}

/**
 * The devotee's darshan ticket. The QR encodes the public status URL, so a phone
 * camera opens live status and the gate scanner reads the token code from it.
 */
export default function TokenTicket({ token, compact = false, className }) {
  const tz = token.temple.timezone;
  const inactive = ['cancelled', 'expired', 'completed'].includes(token.status);

  return (
    <div className={cx('card overflow-hidden', className)}>
      <div className="bg-linear-to-br from-saffron-800 to-temple-900 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-saffron-200">
              <Landmark className="size-3.5" /> Smart Darshan token
            </p>
            <p className="mt-1 truncate font-display text-xl">{token.temple.name}</p>
            <p className="text-sm text-saffron-100">{token.darshanType.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap font-mono text-lg font-semibold tracking-wider">{token.code}</p>
            <p className="whitespace-nowrap text-xs text-saffron-200">{token.source === 'walkin' ? 'Walk-in' : 'Online'}</p>
          </div>
        </div>
      </div>

      <div className={cx('grid gap-5 p-5', compact ? 'grid-cols-[auto_1fr]' : 'sm:grid-cols-[auto_1fr]')}>
        <div className={cx('mx-auto rounded-xl border border-temple-200 bg-white p-3', inactive && 'opacity-40')}>
          <QRCodeSVG value={tokenUrl(token.code)} size={compact ? 112 : 168} level="M" marginSize={0} />
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <TokenStatusBadge status={token.status} />
            {token.darshanType.isPriority && (
              <Badge tone="violet" icon={Accessibility}>
                Priority lane
              </Badge>
            )}
          </div>
          <p className="text-base font-semibold text-temple-900">{token.name}</p>
          <p className="flex items-center gap-2 text-temple-700">
            <CalendarDays className="size-4 text-temple-400" /> {fmtDateStr(token.slot.date)}
          </p>
          <p className="flex items-center gap-2 text-temple-700">
            <Clock className="size-4 text-temple-400" /> {fmtSlot(token.slot.startAt, token.slot.endAt, tz)}
          </p>
          <p className="flex items-center gap-2 text-temple-700">
            <Users className="size-4 text-temple-400" /> {token.groupSize} {token.groupSize === 1 ? 'person' : 'people'}
          </p>
          {!compact && token.status === 'booked' && (
            <p className="rounded-lg bg-saffron-50 px-3 py-2 text-xs text-saffron-900">
              Show this QR at the entry gate between {fmtTime(token.entryWindow.opensAt, tz)} and {fmtTime(token.entryWindow.closesAt, tz)}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
