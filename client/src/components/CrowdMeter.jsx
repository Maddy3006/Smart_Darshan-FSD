import { CircleCheck, TriangleAlert } from 'lucide-react';
import { number } from '../lib/format.js';
import { cx } from './ui.jsx';

/** Queue occupancy against the temple's safe limit, with 90% / 100% alert thresholds marked. */
export default function CrowdMeter({ inQueue, maxOccupancy, occupancyPct }) {
  const pct = Math.min(occupancyPct, 110);
  const state = occupancyPct >= 100 ? 'critical' : occupancyPct >= 90 ? 'warning' : 'normal';
  const fill = { normal: 'bg-emerald-600', warning: 'bg-amber-500', critical: 'bg-red-600' }[state];
  const Icon = state === 'normal' ? CircleCheck : TriangleAlert;
  const label = { normal: 'Within safe limit', warning: 'Nearing capacity', critical: 'At full capacity' }[state];

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-semibold text-temple-900">
          {occupancyPct}%<span className="ml-2 text-base font-normal text-temple-500">of safe limit</span>
        </p>
        <p
          className={cx(
            'inline-flex items-center gap-1.5 text-sm font-semibold',
            state === 'normal' ? 'text-emerald-700' : state === 'warning' ? 'text-amber-700' : 'text-red-700',
          )}
        >
          <Icon className="size-4" /> {label}
        </p>
      </div>
      <div
        className="relative mt-3 h-3 rounded-full bg-temple-100"
        role="meter"
        aria-valuenow={occupancyPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Queue occupancy"
      >
        <div className={cx('h-full rounded-full transition-all duration-700', fill)} style={{ width: `${(pct / 110) * 100}%` }} />
        {[90, 100].map((mark) => (
          <span
            key={mark}
            className="absolute -top-1 h-5 w-0.5 bg-temple-700"
            style={{ left: `${(mark / 110) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-temple-500">
        <span className="absolute -translate-x-1/2" style={{ left: `${(90 / 110) * 100}%` }}>
          90%
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(100 / 110) * 100}%` }}>
          100%
        </span>
      </div>
      <p className="mt-1 text-sm text-temple-600">
        {number(inQueue)} people in queue · limit {number(maxOccupancy)}
      </p>
    </div>
  );
}
