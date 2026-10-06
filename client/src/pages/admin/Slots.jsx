import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { Badge, Button, Card, cx, ErrorBanner, PageHeader, PageLoader, Segmented } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { addDays, fmtDateStr, fmtSlot, number, todayIn } from '../../lib/format.js';

export default function Slots() {
  const { temple } = useOutletContext();
  const tz = temple.timezone;
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [typeId, setTypeId] = useState(temple.darshanTypes[0]?._id);
  const [syncing, setSyncing] = useState(false);
  const { data, error, loading, reload } = useFetch(async () => (await api.get('/admin/slots', { params: { date } })).data, [date]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data: res } = await api.post('/admin/slots/sync', {});
      toast.success(`Slots synced: ${res.result.created} created, ${res.result.updated} updated, ${res.result.removed} removed`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const days = Array.from({ length: temple.settings.bookingWindowDays }, (_, i) => addDays(today, i));
  const slots = (data?.slots || []).filter((s) => s.darshanTypeId === typeId);

  return (
    <div>
      <PageHeader
        title="Darshan slots"
        subtitle="Capacity and bookings per slot. Slots are generated automatically for the booking window."
        actions={
          <Button variant="secondary" icon={RefreshCw} loading={syncing} onClick={sync}>
            Sync slots now
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={cx(
                'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium',
                d === date ? 'border-saffron-700 bg-saffron-700 text-white' : 'border-temple-200 bg-white hover:bg-temple-100',
              )}
            >
              {d === today ? 'Today' : fmtDateStr(d, { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
        <Segmented value={typeId} onChange={setTypeId} options={temple.darshanTypes.map((dt) => ({ value: dt._id, label: dt.name }))} />
      </div>

      <ErrorBanner message={error} onRetry={reload} />
      {data?.slots?.[0]?.isFestival && (
        <p className="mb-3 flex items-center gap-2 text-sm text-saffron-800">
          <Sparkles className="size-4" /> Festival day: capacity is multiplied by {temple.settings.festivalCapacityMultiplier}×
        </p>
      )}

      {loading && !data ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-temple-50 text-left text-xs text-temple-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Slot</th>
                <th className="px-3 py-2.5 text-right font-semibold">Online booked</th>
                <th className="px-3 py-2.5 text-right font-semibold">Walk-in booked</th>
                <th className="px-3 py-2.5 text-right font-semibold">Seats left</th>
                <th className="px-3 py-2.5 text-right font-semibold">Entered</th>
                <th className="px-3 py-2.5 text-right font-semibold">Completed</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-temple-100">
              {slots.map((slot) => (
                <tr key={slot._id} className={cx(slot.isCurrent && 'bg-saffron-50/70', slot.isPast && 'text-temple-400')}>
                  <td className="px-4 py-2.5 font-medium">{fmtSlot(slot.startAt, slot.endAt, tz)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {number(slot.onlineBooked)} / {number(slot.onlineCapacity)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {number(slot.walkinBooked)} / {number(slot.walkinCapacity)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{number(slot.available.total)}</td>
                  <td className="px-3 py-2.5 text-right">{number((slot.people.checked_in || 0) + (slot.people.completed || 0))}</td>
                  <td className="px-3 py-2.5 text-right">{number(slot.people.completed || 0)}</td>
                  <td className="px-4 py-2.5">
                    {slot.isCurrent ? (
                      <Badge tone="saffron">Now</Badge>
                    ) : slot.isPast ? (
                      <Badge>Past</Badge>
                    ) : slot.available.total === 0 ? (
                      <Badge tone="red">Full</Badge>
                    ) : slot.available.releaseActive ? (
                      <Badge tone="green">Open to walk-ins</Badge>
                    ) : (
                      <Badge tone="blue">Upcoming</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {!slots.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-temple-500">
                    No slots for this date. Check the temple timings, then sync slots.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
