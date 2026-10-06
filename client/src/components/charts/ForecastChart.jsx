import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS, CROWD_LEVELS } from '../../lib/constants.js';
import { hourLabel, hourRange, number } from '../../lib/format.js';
import ChartFrame from './ChartFrame.jsx';

const AXIS = { fontSize: 12, fill: CHART_COLORS.axis };

function ForecastTooltip({ active, payload, showActual }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-temple-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-temple-900">{hourRange(row.hour)}</p>
      {showActual ? (
        <>
          <p className="text-temple-700">
            Actual entries: <span className="tnum font-semibold text-temple-900">{number(row.entries)}</span>
          </p>
          <p className="text-temple-700">
            Predicted: <span className="tnum font-semibold text-temple-900">{number(row.predicted)}</span>
          </p>
        </>
      ) : (
        <>
          <p className="text-temple-700">
            Expected visitors: <span className="tnum font-semibold text-temple-900">{number(row.predicted)}</span>
          </p>
          <p className="text-temple-700">
            {CROWD_LEVELS[row.level]?.label} ({row.loadPct}% of capacity)
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Devotee view: expected visitors per hour, bars coloured by crowd level (with a labelled legend).
 * Admin view (`showActual`): actual entries as bars vs the model's prediction as a line, on one axis.
 */
export default function ForecastChart({ hours, currentHour = null, recommendedHours = [], showActual = false, height = 240 }) {
  if (!hours?.length) return <p className="py-10 text-center text-sm text-temple-500">No forecast available.</p>;

  const legend = showActual
    ? [
        { label: 'Actual entries', color: CHART_COLORS.actual },
        { label: 'Predicted by model', color: CHART_COLORS.predicted, shape: 'line' },
      ]
    : Object.values(CROWD_LEVELS).map((l) => ({ label: l.label, color: l.color }));

  const columns = showActual
    ? [
        { key: 'hour', label: 'Hour', format: hourRange },
        { key: 'entries', label: 'Actual', align: 'right', format: number },
        { key: 'predicted', label: 'Predicted', align: 'right', format: number },
      ]
    : [
        { key: 'hour', label: 'Hour', format: hourRange },
        { key: 'predicted', label: 'Expected visitors', align: 'right', format: number },
        { key: 'level', label: 'Crowd', format: (v) => CROWD_LEVELS[v]?.short },
        { key: 'recommended', label: 'Tip', format: (_, row) => (recommendedHours.includes(row.hour) ? 'Good time' : '') },
      ];

  return (
    <ChartFrame legend={legend} columns={columns} rows={hours}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={hours} margin={{ top: 16, right: 8, bottom: 0, left: -8 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey="hour"
            tickFormatter={hourLabel}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.baseline }}
            minTickGap={16}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => number(v)} />
          <Tooltip content={<ForecastTooltip showActual={showActual} />} cursor={{ fill: '#f3ece3', opacity: 0.6 }} />
          {currentHour !== null && (
            <ReferenceLine
              x={currentHour}
              stroke="#564537"
              strokeWidth={1}
              label={{ value: 'Now', position: 'top', fontSize: 11, fill: '#564537' }}
            />
          )}
          {showActual ? (
            <>
              <Bar
                dataKey="entries"
                name="Actual entries"
                isAnimationActive={false}
                fill={CHART_COLORS.actual}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                dataKey="predicted"
                name="Predicted"
                isAnimationActive={false}
                stroke={CHART_COLORS.predicted}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                type="monotone"
              />
            </>
          ) : (
            <Bar dataKey="predicted" name="Expected visitors" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={32}>
              {hours.map((h) => (
                <Cell
                  key={h.hour}
                  fill={CROWD_LEVELS[h.level]?.color}
                  fillOpacity={currentHour !== null && h.hour < currentHour ? 0.35 : 1}
                />
              ))}
            </Bar>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
