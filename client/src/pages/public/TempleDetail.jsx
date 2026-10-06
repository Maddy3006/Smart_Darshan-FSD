import { Accessibility, Clock, Info, MapPin, Megaphone, Monitor, Sparkles, Ticket, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ForecastChart from '../../components/charts/ForecastChart.jsx';
import LiveLanes from '../../components/LiveLanes.jsx';
import { LiveDot } from '../../components/StatusBadge.jsx';
import { TempleArt } from '../../components/TempleCard.jsx';
import { Badge, Card, CardHeader, EmptyState, LinkButton, PageLoader, cx } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket, useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api } from '../../lib/api.js';
import { addDays, currentHourIn, fmtDateStr, hourRange, rupees, todayIn } from '../../lib/format.js';

export function RecommendedHours({ forecast }) {
  if (!forecast?.recommendedHours?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <Sparkles className="size-4 shrink-0" />
      <span className="font-semibold">Best times to visit:</span>
      {forecast.recommendedHours.map((h) => (
        <span key={h} className="rounded-full bg-white px-2.5 py-0.5 font-medium ring-1 ring-emerald-200">
          {hourRange(h)}
        </span>
      ))}
    </div>
  );
}

export default function TempleDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { connected } = useSocket();
  const templeReq = useFetch(async () => (await api.get(`/temples/${slug}`)).data.temple, [slug]);
  const temple = templeReq.data;
  const tz = temple?.timezone;
  const today = todayIn(tz);
  const [date, setDate] = useState(null);
  const selectedDate = date || today;

  const live = useLiveTemple(temple?._id);
  const forecastReq = useFetch(
    async () => (temple ? (await api.get(`/temples/${temple._id}/forecast`, { params: { date: selectedDate } })).data.forecast : null),
    [temple?._id, selectedDate],
  );
  const announcementsReq = useFetch(
    async () => (temple ? (await api.get(`/temples/${temple._id}/announcements`)).data.announcements : []),
    [temple?._id],
  );

  useSocketEvent('announcement:new', (a) => {
    if (String(a.templeId) === String(temple?._id)) announcementsReq.setData((list) => [a, ...(list || [])]);
  });

  if (templeReq.loading && !temple) return <PageLoader />;
  if (templeReq.error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Temple not found"
        message={templeReq.error}
        action={<LinkButton to="/">Back to temples</LinkButton>}
      />
    );
  }

  const forecast = forecastReq.data;
  const days = Array.from({ length: Math.min(7, temple.settings.bookingWindowDays) }, (_, i) => addDays(today, i));
  const canBook = !user || user.role === 'devotee';

  return (
    <div>
      <section className="relative">
        <TempleArt temple={temple} className="h-48 sm:h-56" />
        <div className="absolute inset-0 bg-linear-to-t from-temple-950/90 via-temple-950/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 pb-6 text-white">
            <div>
              {live?.festival && (
                <Badge tone="saffron" icon={Sparkles} className="mb-2">
                  {live.festival} today
                </Badge>
              )}
              <h1 className="text-3xl sm:text-4xl">{temple.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-temple-200">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> {temple.address ? `${temple.address}, ` : ''}
                  {temple.city}, {temple.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" /> Open {temple.openTime} – {temple.closeTime}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <LinkButton to={`/display/${temple.slug}`} variant="secondary" icon={Monitor} target="_blank">
                Display board
              </LinkButton>
              {canBook && (
                <LinkButton to={`/temples/${temple.slug}/book`} icon={Ticket}>
                  Book darshan
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {temple.description && <p className="max-w-3xl text-temple-700">{temple.description}</p>}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl">Live queue</h2>
            <LiveDot connected={connected} />
          </div>
          <LiveLanes live={live} timezone={tz} />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader
              title="Crowd forecast"
              subtitle={
                forecast?.source === 'ml-model'
                  ? 'Predicted by our machine-learning model from past footfall'
                  : 'Estimated from historical averages'
              }
            />
            <div className="space-y-4 p-5">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cx(
                      'shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                      d === selectedDate
                        ? 'border-saffron-700 bg-saffron-700 text-white'
                        : 'border-temple-200 bg-white text-temple-700 hover:bg-temple-100',
                    )}
                  >
                    {d === today ? 'Today' : fmtDateStr(d, { weekday: 'short', day: 'numeric' })}
                    {temple.festivals.some((f) => f.date === d) && <Sparkles className="ml-1 inline size-3" />}
                  </button>
                ))}
              </div>
              {forecast?.festival && (
                <p className="flex items-center gap-2 text-sm text-saffron-800">
                  <Sparkles className="size-4" /> {forecast.festival}: expect larger crowds; slots have extra capacity.
                </p>
              )}
              <div className={cx(forecastReq.loading && 'opacity-60 transition')}>
                <ForecastChart
                  hours={forecast?.hours}
                  recommendedHours={forecast?.recommendedHours}
                  currentHour={selectedDate === today ? currentHourIn(tz) : null}
                />
              </div>
              <RecommendedHours forecast={forecast} />
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Darshan types" icon={Ticket} />
              <ul className="divide-y divide-temple-100">
                {temple.darshanTypes.map((dt) => (
                  <li key={dt._id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-temple-900">{dt.name}</p>
                      <span className="text-sm font-semibold text-saffron-800">{rupees(dt.price)}</span>
                    </div>
                    {dt.description && <p className="text-sm text-temple-600">{dt.description}</p>}
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-temple-500">
                      {dt.slotMinutes}-minute slots
                      {dt.isPriority && (
                        <Badge tone="violet" icon={Accessibility}>
                          Priority lane
                        </Badge>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Announcements" icon={Megaphone} />
              <div className="space-y-2 p-5">
                {announcementsReq.data?.length ? (
                  announcementsReq.data.map((a) => (
                    <p
                      key={a._id}
                      className={cx(
                        'rounded-lg px-3 py-2 text-sm',
                        a.type === 'urgent'
                          ? 'bg-red-50 text-red-800'
                          : a.type === 'warning'
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-temple-50 text-temple-700',
                      )}
                    >
                      {a.message}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-temple-500">No announcements right now.</p>
                )}
              </div>
            </Card>

            <Card className="p-5 text-sm text-temple-700">
              <p className="flex items-center gap-2 font-semibold text-temple-900">
                <Info className="size-4 text-saffron-700" /> Before you visit
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Reach the entry gate up to {temple.settings.checkinEarlyMin} minutes before your slot.</li>
                <li>Entry stays open until {temple.settings.checkinLateMin} minutes after your slot ends.</li>
                <li>One token covers up to {temple.settings.maxGroupSize} people.</li>
                <li>
                  No smartphone? Get a walk-in token at the counter, or SMS <span className="font-mono">STATUS &lt;code&gt;</span>.
                </li>
              </ul>
              {!user && (
                <p className="mt-3">
                  <Link to="/register" className="font-semibold text-saffron-800 hover:underline">
                    Create a free account
                  </Link>{' '}
                  to book online.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
