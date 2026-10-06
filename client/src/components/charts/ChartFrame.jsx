import { ChartColumn, Table } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../ui.jsx';

/**
 * Wraps a chart with a legend row and a "table view" toggle, so every value
 * can also be read without relying on colour or hover.
 */
export default function ChartFrame({ legend, columns, rows, children, className }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-temple-600">
          {legend?.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cx(item.shape === 'line' ? 'h-0.5 w-4' : 'size-2.5 rounded-sm')}
                style={{ background: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
        {columns && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-temple-600 hover:bg-temple-100"
          >
            {showTable ? <ChartColumn className="size-3.5" /> : <Table className="size-3.5" />}
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {showTable && columns ? (
        <div className="max-h-72 overflow-auto rounded-lg border border-temple-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-temple-50 text-left text-xs text-temple-600">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={cx('px-3 py-2 font-semibold', c.align === 'right' && 'text-right')}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-temple-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={cx('px-3 py-1.5', c.align === 'right' && 'text-right')}>
                      {c.format ? c.format(row[c.key], row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function ChartTooltip({ active, payload, title }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-temple-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-temple-900">{title(payload[0].payload)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-temple-700">
          <span className="size-2 rounded-full" style={{ background: p.color || p.payload.fill }} />
          {p.name}: <span className="tnum font-semibold text-temple-900">{Number(p.value).toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
}
