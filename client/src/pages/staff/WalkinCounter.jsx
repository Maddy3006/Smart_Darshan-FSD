import { Accessibility, Printer, RefreshCw, Ticket } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { PausedBanner } from '../../components/LiveLanes.jsx';
import { TokenStatusBadge } from '../../components/StatusBadge.jsx';
import TokenSlip from '../../components/TokenSlip.jsx';
import { Badge, Button, Card, CardHeader, cx, ErrorBanner, Field, Input, PageHeader, Select, Stepper } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api, errorMessage } from '../../lib/api.js';
import { fmtSlot, fmtTime, waitLabel } from '../../lib/format.js';

export default function WalkinCounter() {
  const { temple } = useOutletContext();
  const tz = temple.timezone;
  const live = useLiveTemple(temple._id);
  const [typeId, setTypeId] = useState(temple.darshanTypes[0]?._id);
  const [slotId, setSlotId] = useState('');
  const [groupSize, setGroupSize] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState(null);

  const slotsReq = useFetch(async () => (await api.get('/staff/walkin/slots', { params: { darshanTypeId: typeId } })).data.slots, [typeId]);
  const walkins = useFetch(
    async () => (await api.get('/staff/tokens', { params: { source: 'walkin', sort: 'recent', limit: 15 } })).data.tokens,
    [],
  );

  const openSlots = (slotsReq.data || []).filter((s) => s.available.walkin > 0);

  const reset = () => {
    setIssued(null);
    setName('');
    setPhone('');
    setGroupSize(1);
    setSlotId('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/staff/walkin', {
        darshanTypeId: typeId,
        slotId: slotId || undefined,
        groupSize,
        name: name.trim() || 'Walk-in Devotee',
        phone,
      });
      setIssued(data.token);
      toast.success(`Token ${data.token.code} issued`);
      slotsReq.reload();
      walkins.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Walk-in counter" subtitle="Issue tokens to devotees who arrive without an online booking." />
      <PausedBanner live={live} className="mb-4" />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        {issued ? (
          <Card className="p-6">
            <p className="mb-4 text-center text-lg font-semibold text-emerald-700">Token issued. Hand over the printed slip.</p>
            <TokenSlip token={issued} />
            <div className="no-print mt-5 flex justify-center gap-2">
              <Button icon={Printer} onClick={() => window.print()}>
                Print slip
              </Button>
              <Button variant="secondary" onClick={reset}>
                Next devotee
              </Button>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="New walk-in token" icon={Ticket} />
            <form onSubmit={submit} className="space-y-5 p-5">
              <Field label="Darshan type">
                <div className="grid gap-2 sm:grid-cols-3">
                  {temple.darshanTypes.map((dt) => {
                    const lane = live?.lanes.find((l) => l.darshanTypeId === dt._id);
                    return (
                      <button
                        key={dt._id}
                        type="button"
                        onClick={() => {
                          setTypeId(dt._id);
                          setSlotId('');
                        }}
                        className={cx(
                          'rounded-xl border p-3 text-left transition',
                          dt._id === typeId
                            ? 'border-saffron-700 bg-saffron-50 ring-2 ring-saffron-200'
                            : 'border-temple-200 hover:bg-temple-50',
                        )}
                      >
                        <p className="text-sm font-semibold text-temple-900">{dt.name}</p>
                        {lane && <p className="text-xs text-temple-500">Queue wait {waitLabel(lane.waitMin)}</p>}
                        {dt.isPriority && (
                          <Badge tone="violet" icon={Accessibility} className="mt-1">
                            Priority
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Number of people" hint={`Max ${temple.settings.maxGroupSize}`}>
                  <Stepper value={groupSize} onChange={setGroupSize} max={temple.settings.maxGroupSize} />
                </Field>
                <Field label="Slot" hint="Next available is picked automatically">
                  <Select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
                    <option value="">Next available slot</option>
                    {openSlots.map((s) => (
                      <option key={s._id} value={s._id}>
                        {fmtSlot(s.startAt, s.endAt, tz)} · {s.available.walkin} seats
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Devotee name" htmlFor="name" hint="Optional">
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Walk-in Devotee" />
                </Field>
                <Field label="Mobile (for SMS token)" htmlFor="phone" hint="Optional">
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </div>

              {openSlots.length === 0 && !slotsReq.loading && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No walk-in seats are left today for this darshan type.
                </p>
              )}
              <ErrorBanner message={error} />
              <Button type="submit" size="lg" className="w-full" loading={submitting}>
                Issue token
              </Button>
            </form>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Today's walk-ins"
            actions={
              <Button size="sm" variant="ghost" icon={RefreshCw} onClick={walkins.reload}>
                Refresh
              </Button>
            }
          />
          <ul className="divide-y divide-temple-100">
            {walkins.data?.length ? (
              walkins.data.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold">{t.code}</p>
                    <p className="truncate text-temple-500">
                      {t.darshanType.name} · {fmtTime(t.slot.startAt, tz)} · {t.groupSize} ppl
                    </p>
                  </div>
                  <TokenStatusBadge status={t.status} />
                </li>
              ))
            ) : (
              <li className="px-5 py-8 text-center text-sm text-temple-500">No walk-in tokens yet today.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
