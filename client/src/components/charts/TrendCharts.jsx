import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from '../../lib/constants.js';
import { fmtDateStr, hourLabel, hourRange, number, WEEKDAYS } from '../../lib/format.js';
import ChartFrame from './ChartFrame.jsx';

const AXIS = { fontSize: 12, fill: CHART_COLORS.axis };

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-temple-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-temple-900">{fmtDateStr(d.date)}</p>
      <p className="text-temple-700">
        Visitors: <span className="tnum font-semibold text-temple-900">{number(d.entries)}</span>
      </p>
      {d.isFestival && <p className="text-temple-700">Festival day</p>}
    </div>
  );
}

/** Daily visitor totals; festival days get the second series colour and a legend entry. */
export function DailyTrendChart({ daily }) {
  return (
    <ChartFrame
      legend={[
        { label: 'Regular day', color: CHART_COLORS.actual },
        { label: 'Festival day', color: CHART_COLORS.festival },
      ]}
      columns={[
        { key: 'date', label: 'Date', format: (v) => fmtDateStr(v) },
        { key: 'entries', label: 'Visitors', align: 'right', format: number },
        { key: 'isFestival', label: 'Festival', format: (v) => (v ? 'Yes' : '') },
      ]}
      rows={daily}
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtDateStr(v, { day: 'numeric', month: 'short' })}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.baseline }}
            minTickGap={24}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => number(v)} />
          <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f3ece3', opacity: 0.6 }} />
          <Bar dataKey="entries" name="Visitors" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={24}>
            {daily.map((d) => (
              <Cell key={d.date} fill={d.isFestival ? CHART_COLORS.festival : CHART_COLORS.actual} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Average visitors by weekday x hour, on a single-hue light-to-dark ramp. */
export function WeekHeatmap({ heatmap }) {
  if (!heatmap?.length) return <p className="py-8 text-center text-sm text-temple-500">Not enough history yet.</p>;
  const hours = [...new Set(heatmap.map((c) => c.hour))].sort((a, b) => a - b);
  const max = Math.max(...heatmap.map((c) => c.avg), 1);
  const lookup = new Map(heatmap.map((c) => [`${c.dayOfWeek}|${c.hour}`, c.avg]));
  const ramp = CHART_COLORS.heat;
  const colorFor = (value) => ramp[Math.min(ramp.length - 1, Math.floor((value / max) * ramp.length))];
  const order = [1, 2, 3, 4, 5, 6, 0];

  const rows = order.flatMap((dow) => hours.map((hour) => ({ day: WEEKDAYS[dow], hour, avg: lookup.get(`${dow}|${hour}`) ?? 0 })));

  return (
    <ChartFrame
      columns={[
        { key: 'day', label: 'Day' },
        { key: 'hour', label: 'Hour', format: hourRange },
        { key: 'avg', label: 'Avg visitors', align: 'right', format: number },
      ]}
      rows={rows}
      legend={[]}
    >
      <div className="overflow-x-auto">
        <div
          className="inline-grid min-w-full gap-0.5"
          style={{ gridTemplateColumns: `3rem repeat(${hours.length}, minmax(1.6rem, 1fr))` }}
        >
          <span />
          {hours.map((h) => (
            <span key={h} className="pb-1 text-center text-[10px] text-temple-500">
              {h % 3 === 0 ? hourLabel(h).replace(' ', '') : ''}
            </span>
          ))}
          {order.map((dow) => (
            <div key={dow} className="contents">
              <span className="pr-2 text-right text-xs leading-7 text-temple-600">{WEEKDAYS[dow]}</span>
              {hours.map((hour) => {
                const value = lookup.get(`${dow}|${hour}`) ?? 0;
                return (
                  <span
                    key={hour}
                    title={`${WEEKDAYS[dow]} ${hourRange(hour)}: ${number(value)} visitors on average`}
                    className="h-7 rounded-[3px] transition hover:outline-2 hover:outline-temple-900"
                    style={{ background: colorFor(value) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-temple-500">
        <span>Fewer</span>
        <span className="flex h-2.5 w-40 overflow-hidden rounded-full">
          {ramp.map((c) => (
            <span key={c} className="flex-1" style={{ background: c }} />
          ))}
        </span>
        <span>More visitors (max {number(max)}/hour)</span>
      </div>
    </ChartFrame>
  );
}

const FEATURE_LABELS = {
  hour: 'Hour of day',
  hour_sin: 'Hour (cyclic sine)',
  hour_cos: 'Hour (cyclic cosine)',
  day_of_week: 'Day of week',
  is_weekend: 'Weekend',
  is_festival: 'Festival day',
  month: 'Month',
};

/** Which inputs the Random Forest relies on most. One series, one colour, values labelled. */
export function FeatureImportance({ importances }) {
  const rows = Object.entries(importances || {})
    .map(([key, value]) => ({ key, label: FEATURE_LABELS[key] || key, pct: Math.round(value * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
  const max = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[9.5rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-temple-700">{r.label}</span>
          <span className="h-2.5 rounded-full bg-temple-100">
            <span className="block h-full rounded-full" style={{ width: `${(r.pct / max) * 100}%`, background: CHART_COLORS.actual }} />
          </span>
          <span className="tnum text-right font-medium text-temple-900">{r.pct}%</span>
        </li>
      ))}
    </ul>
  );
}
