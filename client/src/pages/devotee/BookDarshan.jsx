import { Accessibility, ArrowLeft, CalendarDays, CircleCheck, Sparkles, Ticket, TriangleAlert, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { CrowdLevelBadge } from '../../components/StatusBadge.jsx';
import TokenTicket from '../../components/TokenTicket.jsx';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  cx,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  LinkButton,
  PageLoader,
  Stepper,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRoom, useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { addDays, fmtDateStr, fmtSlot, fmtTime, hourRange, rupees, todayIn } from '../../lib/format.js';

function localHourOf(date, tz) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(date))) % 24;
}

export default function BookDarshan() {
  const { slug } = useParams();
  const { user } = useAuth();
  const templeReq = useFetch(async () => (await api.get(`/temples/${slug}`)).data.temple, [slug]);
  const temple = templeReq.data;
  const tz = temple?.timezone;
  const today = todayIn(tz);

  const [date, setDate] = useState(today);
  const [typeId, setTypeId] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const [groupSize, setGroupSize] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  const darshanType = temple?.darshanTypes.find((d) => d._id === typeId) || temple?.darshanTypes[0];

  const slotsReq = useFetch(
    async () =>
      temple && darshanType
        ? (await api.get(`/temples/${temple._id}/slots`, { params: { date, darshanTypeId: darshanType._id } })).data
        : null,
    [temple?._id, darshanType?._id, date],
  );
  const forecastReq = useFetch(
    async () => (temple ? (await api.get(`/temples/${temple._id}/forecast`, { params: { date } })).data.forecast : null),
    [temple?._id, date],
  );

  useRoom('temple', temple?._id);
  useSocketEvent('slot:update', (slot) => {
    slotsReq.setData((data) => (data ? { ...data, slots: data.slots.map((s) => (s._id === slot._id ? slot : s)) } : data));
  });

  const levelByHour = useMemo(() => new Map((forecastReq.data?.hours || []).map((h) => [h.hour, h.level])), [forecastReq.data]);
  const recommended = forecastReq.data?.recommendedHours || [];

  if (templeReq.loading && !temple) return <PageLoader />;
  if (!temple) return <EmptyState icon={TriangleAlert} title="Temple not found" action={<LinkButton to="/">Back</LinkButton>} />;
  if (!darshanType)
    return (
      <EmptyState icon={Ticket} title="Online booking is not available at this temple yet" action={<LinkButton to="/">Back</LinkButton>} />
    );

  const days = Array.from({ length: temple.settings.bookingWindowDays }, (_, i) => addDays(today, i));
  const slots = slotsReq.data?.slots || [];
  const selectedSlot = slots.find((s) => s._id === slotId);
  const cutoff = Date.now() + 10 * 60_000;

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/tokens', { slotId, groupSize, name, phone });
      setBooked(data.token);
      toast.success(`Booked! Token ${data.token.code}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(errorMessage(err));
      slotsReq.reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (booked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 text-center">
          <CircleCheck className="mx-auto size-14 text-emerald-600" />
          <h1 className="mt-3 text-3xl">Darshan booked</h1>
          <p className="text-temple-600">Save this ticket. You can also find it under My tokens.</p>
        </div>
        <TokenTicket token={booked} />
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <LinkButton to={`/t/${booked.code}`}>Track live status</LinkButton>
          <LinkButton to="/my-tokens" variant="secondary">
            My tokens
          </LinkButton>
          <Button
            variant="ghost"
            onClick={() => {
              setBooked(null);
              setSlotId(null);
            }}
          >
            Book another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to={`/temples/${temple.slug}`} className="inline-flex items-center gap-1.5 text-sm text-temple-600 hover:text-temple-900">
        <ArrowLeft className="size-4" /> {temple.name}
      </Link>
      <h1 className="mt-2 text-3xl">Book darshan</h1>
      <p className="text-temple-600">Choose a date, darshan type and time slot. Green times are expected to be less crowded.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="1. Date" icon={CalendarDays} />
            <div className="flex gap-2 overflow-x-auto p-5">
              {days.map((d) => {
                const festival = temple.festivals.find((f) => f.date === d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setSlotId(null);
                    }}
                    className={cx(
                      'min-w-20 shrink-0 rounded-xl border px-3 py-2 text-center transition',
                      d === date ? 'border-saffron-700 bg-saffron-700 text-white' : 'border-temple-200 bg-white hover:bg-temple-100',
                    )}
                  >
                    <span className="block text-xs opacity-80">{d === today ? 'Today' : fmtDateStr(d, { weekday: 'short' })}</span>
                    <span className="block text-lg font-semibold">{fmtDateStr(d, { day: 'numeric' })}</span>
                    <span className="block text-xs opacity-80">{fmtDateStr(d, { month: 'short' })}</span>
                    {festival && <Sparkles className="mx-auto mt-0.5 size-3" aria-label={festival.name} />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="2. Darshan type" icon={Ticket} />
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {temple.darshanTypes.map((dt) => (
                <button
                  key={dt._id}
                  type="button"
                  onClick={() => {
                    setTypeId(dt._id);
                    setSlotId(null);
                  }}
                  className={cx(
                    'rounded-xl border p-4 text-left transition',
                    dt._id === darshanType._id
                      ? 'border-saffron-700 bg-saffron-50 ring-2 ring-saffron-200'
                      : 'border-temple-200 hover:bg-temple-50',
                  )}
                >
                  <p className="font-semibold text-temple-900">{dt.name}</p>
                  <p className="mt-1 text-sm font-semibold text-saffron-800">{rupees(dt.price)}</p>
                  <p className="mt-1 text-xs text-temple-500">{dt.slotMinutes}-minute slots</p>
                  {dt.isPriority && (
                    <Badge tone="violet" icon={Accessibility} className="mt-2">
                      Seniors & differently-abled
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="3. Time slot"
              subtitle={
                slotsReq.data?.festival ? `${slotsReq.data.festival}: extra capacity added for the festival` : 'Seats left are updated live'
              }
            />
            <div className="p-5">
              {recommended.length > 0 && (
                <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-emerald-800">
                  <Sparkles className="size-4" /> Least crowded: {recommended.map(hourRange).join(', ')}
                </p>
              )}
              {slotsReq.loading && !slotsReq.data ? (
                <PageLoader label="Loading slots..." />
              ) : slots.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No slots on this date" message="The temple may be closed. Try another date." />
              ) : (
                <div className={cx('grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4', slotsReq.loading && 'opacity-60')}>
                  {slots.map((slot) => {
                    const hour = localHourOf(slot.startAt, tz);
                    const closed = new Date(slot.endAt).getTime() < cutoff;
                    const full = slot.available.online < groupSize;
                    const disabled = closed || full;
                    const isRecommended = recommended.includes(hour) && !disabled;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSlotId(slot._id)}
                        className={cx(
                          'relative rounded-xl border px-3 py-2.5 text-left transition',
                          slot._id === slotId
                            ? 'border-saffron-700 bg-saffron-50 ring-2 ring-saffron-200'
                            : 'border-temple-200 bg-white hover:border-temple-300',
                          disabled && 'cursor-not-allowed bg-temple-50 opacity-50',
                        )}
                      >
                        <p className="text-sm font-semibold text-temple-900">{fmtTime(slot.startAt, tz)}</p>
                        <p className="text-xs text-temple-500">
                          {closed ? 'Closed' : full ? 'Full' : `${slot.available.online} seats left`}
                        </p>
                        {!disabled && levelByHour.get(hour) && (
                          <div className="mt-1">
                            <CrowdLevelBadge level={levelByHour.get(hour)} short />
                          </div>
                        )}
                        {isRecommended && (
                          <Sparkles className="absolute right-2 top-2 size-3.5 text-emerald-600" aria-label="Recommended" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader title="4. Devotee details" icon={Users} />
            <div className="space-y-4 p-5">
              <Field label="Number of people" hint={`Up to ${temple.settings.maxGroupSize} people per token`}>
                <Stepper value={groupSize} onChange={setGroupSize} max={temple.settings.maxGroupSize} />
              </Field>
              <Field label="Name of lead devotee" htmlFor="name">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Mobile for SMS updates" htmlFor="phone" hint="Optional">
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>

              <div className="rounded-xl bg-temple-50 p-4 text-sm">
                <p className="font-semibold text-temple-900">Summary</p>
                <dl className="mt-2 space-y-1 text-temple-700">
                  <div className="flex justify-between gap-2">
                    <dt>Date</dt>
                    <dd className="font-medium">{fmtDateStr(date)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Darshan</dt>
                    <dd className="text-right font-medium">{darshanType.name}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Slot</dt>
                    <dd className="font-medium">{selectedSlot ? fmtSlot(selectedSlot.startAt, selectedSlot.endAt, tz) : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Amount</dt>
                    <dd className="font-medium">
                      {darshanType.price ? `${rupees(darshanType.price * groupSize)} (pay at counter)` : 'Free'}
                    </dd>
                  </div>
                </dl>
              </div>

              <ErrorBanner message={error} />
              <Button className="w-full" size="lg" disabled={!selectedSlot || name.trim().length < 2} loading={submitting} onClick={submit}>
                Confirm booking
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
