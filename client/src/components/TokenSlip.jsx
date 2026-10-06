import { QRCodeSVG } from 'qrcode.react';
import { fmtDateStr, fmtSlot, fmtTime } from '../lib/format.js';
import { tokenUrl } from './TokenTicket.jsx';
import { cx } from './ui.jsx';

/** Compact printable slip for walk-in tokens (counter printer or kiosk). */
export default function TokenSlip({ token, className }) {
  const tz = token.temple.timezone;
  return (
    <div
      className={cx(
        'print-area mx-auto w-full max-w-xs rounded-xl border border-dashed border-temple-300 bg-white p-5 text-center text-temple-900',
        className,
      )}
    >
      <p className="text-xs uppercase tracking-widest text-temple-500">Smart Darshan · Walk-in token</p>
      <p className="mt-1 font-display text-lg leading-tight">{token.temple.name}</p>
      <p className="mt-3 font-mono text-3xl font-bold tracking-wider">{token.code}</p>
      <div className="mx-auto mt-3 w-fit rounded-lg border border-temple-200 p-2">
        <QRCodeSVG value={tokenUrl(token.code)} size={150} marginSize={0} />
      </div>
      <div className="mt-3 space-y-0.5 text-sm">
        <p className="font-semibold">{token.darshanType.name}</p>
        <p>
          {fmtDateStr(token.slot.date)} · {fmtSlot(token.slot.startAt, token.slot.endAt, tz)}
        </p>
        <p>
          {token.name} · {token.groupSize} {token.groupSize === 1 ? 'person' : 'people'}
        </p>
      </div>
      <p className="mt-3 rounded-md bg-temple-100 px-2 py-1.5 text-xs">
        Enter between {fmtTime(token.entryWindow.opensAt, tz)} and {fmtTime(token.entryWindow.closesAt, tz)}
      </p>
      <p className="mt-2 text-[11px] text-temple-500">Scan the QR for live queue status, or SMS &quot;STATUS {token.code}&quot;.</p>
    </div>
  );
}
