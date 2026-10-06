import { Accessibility, CirclePause, Clock, Hourglass, Users } from 'lucide-react';
import { fmtSlot, number, waitLabel } from '../lib/format.js';
import { Badge, cx } from './ui.jsx';

function waitTone(minutes) {
  if (minutes >= 45) return 'text-red-700';
  if (minutes >= 20) return 'text-amber-700';
  return 'text-emerald-700';
}

export function PausedBanner({ live, className }) {
  if (!live?.entryPaused) return null;
  return (
    <div className={cx('flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800', className)}>
      <CirclePause className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">Entry is paused for crowd control</p>
        {live.pauseReason && <p className="text-sm">{live.pauseReason}</p>}
      </div>
    </div>
  );
}

/** One card per darshan lane with live queue length, wait time and the slot being admitted. */
export default function LiveLanes({ live, timezone, showThroughput = false }) {
  if (!live) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-36 animate-pulse bg-temple-100/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PausedBanner live={live} />
      {!live.isOpen && (
        <div className="rounded-xl border border-temple-200 bg-temple-100 px-4 py-3 text-sm text-temple-700">
          The temple is closed right now. Live queue information resumes when darshan opens.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {live.lanes.map((lane) => (
          <div key={lane.darshanTypeId} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold leading-snug text-temple-900">{lane.name}</p>
              {lane.isPriority && (
                <Badge tone="violet" icon={Accessibility}>
                  Priority
                </Badge>
              )}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <Hourglass className="mb-1.5 size-5 text-temple-400" />
              <span className={cx('text-3xl font-semibold', waitTone(lane.waitMin))}>{waitLabel(lane.waitMin)}</span>
              {lane.waitMin > 0 && <span className="mb-1 text-sm text-temple-500">wait</span>}
            </div>
            <div className="mt-3 space-y-1 text-sm text-temple-600">
              <p className="flex items-center gap-2">
                <Users className="size-4 text-temple-400" />
                {number(lane.inQueue)} people in queue
              </p>
              <p className="flex items-center gap-2">
                <Clock className="size-4 text-temple-400" />
                {lane.nowAdmitting
                  ? `Admitting ${fmtSlot(lane.nowAdmitting.startAt, lane.nowAdmitting.endAt, timezone)}`
                  : 'No slot running now'}
              </p>
              {showThroughput && (
                <p className="text-xs text-temple-500">
                  Moving at {lane.throughputPerMin} people/min (
                  {lane.throughputSource === 'measured' ? 'measured at exit gate' : 'estimated from capacity'})
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
