import { Accessibility, CirclePause, Landmark, Maximize, Megaphone, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket, useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch, useInterval } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api } from '../../lib/api.js';
import { fmtDate, fmtSlot, hourRange, number, waitLabel } from '../../lib/format.js';

function waitColor(min) {
  if (min >= 45) return 'text-red-400';
  if (min >= 20) return 'text-amber-300';
  return 'text-emerald-400';
}

/** Full-screen board for TVs at the temple entrance, for devotees without smartphones. */
export default function DisplayBoard() {
  const { slug } = useParams();
  const { connected } = useSocket();
  const [now, setNow] = useState(new Date());
  const templeReq = useFetch(async () => (await api.get(`/temples/${slug}`)).data.temple, [slug]);
  const temple = templeReq.data;
  const live = useLiveTemple(temple?._id);
  const forecastReq = useFetch(
    async () => (temple ? (await api.get(`/temples/${temple._id}/forecast`)).data.forecast : null),
    [temple?._id],
  );
  const announcementsReq = useFetch(
    async () => (temple ? (await api.get(`/temples/${temple._id}/announcements`)).data.announcements : []),
    [temple?._id],
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useInterval(forecastReq.reload, 15 * 60_000);
  // Boards run unattended: keep retrying if the first load failed (e.g. API restarting).
  useInterval(() => !temple && templeReq.reload(), 10_000);
  useSocketEvent('announcement:new', () => announcementsReq.reload());
  useSocketEvent('announcement:update', () => announcementsReq.reload());

  if (!temple) {
    return (
      <div className="grid min-h-screen place-items-center bg-temple-950 text-center text-temple-300">
        <p>{templeReq.error ? `${templeReq.error} Retrying...` : 'Loading display...'}</p>
      </div>
    );
  }

  const tz = temple.timezone;
  const ticker = announcementsReq.data?.map((a) => a.message).join('     •     ');

  return (
    <div className="flex min-h-screen flex-col bg-temple-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-saffron-700">
            <Landmark className="size-8" />
          </span>
          <div>
            <h1 className="text-3xl lg:text-4xl">{temple.name}</h1>
            <p className="text-temple-300">Live darshan queue · {fmtDate(now, tz, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="tnum text-4xl font-semibold">
              {new Intl.DateTimeFormat('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                timeZone: tz,
              }).format(now)}
            </p>
            <p className="flex items-center justify-end gap-2 text-sm text-temple-400">
              <span className={`size-2 rounded-full ${connected ? 'live-dot bg-emerald-400' : 'bg-temple-500'}`} />{' '}
              {connected ? 'Live' : 'Reconnecting'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="rounded-lg p-2 text-temple-400 hover:bg-white/10"
            title="Full screen"
          >
            <Maximize className="size-6" />
          </button>
        </div>
      </header>

      {live?.entryPaused && (
        <div className="flex items-center justify-center gap-4 bg-red-700 px-8 py-5 text-center text-2xl font-semibold lg:text-3xl">
          <CirclePause className="size-10 shrink-0" /> Entry temporarily paused. {live.pauseReason}
        </div>
      )}
      {live?.festival && !live.entryPaused && (
        <div className="flex items-center justify-center gap-3 bg-saffron-800 px-8 py-3 text-xl">
          <Sparkles className="size-6" /> {live.festival}: festival crowd expected
        </div>
      )}

      <main className="grid flex-1 content-start gap-5 p-8 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {!live && <p className="text-2xl text-temple-400">Connecting to live queue...</p>}
          {live && !live.isOpen && (
            <p className="rounded-2xl bg-white/5 p-8 text-3xl text-temple-300">
              The temple is closed now. Darshan opens at {temple.openTime}.
            </p>
          )}
          {live?.lanes.map((lane) => (
            <div
              key={lane.darshanTypeId}
              className="grid items-center gap-6 rounded-2xl bg-white/5 px-8 py-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
            >
              <div>
                <p className="flex items-center gap-3 text-3xl font-semibold">
                  {lane.name}
                  {lane.isPriority && <Accessibility className="size-8 text-violet-300" />}
                </p>
                <p className="mt-1 text-xl text-temple-300">
                  {lane.nowAdmitting
                    ? `Now admitting: ${fmtSlot(lane.nowAdmitting.startAt, lane.nowAdmitting.endAt, tz)} slot`
                    : 'No slot running'}
                </p>
              </div>
              <div>
                <p className="text-base uppercase tracking-wide text-temple-400">In queue</p>
                <p className="tnum text-5xl font-semibold">{number(lane.inQueue)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-base uppercase tracking-wide text-temple-400">Waiting time</p>
                <p className={`text-5xl font-semibold ${waitColor(lane.waitMin)}`}>{waitLabel(lane.waitMin)}</p>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-5">
          {forecastReq.data?.recommendedHours?.length > 0 && (
            <div className="rounded-2xl bg-emerald-900/40 p-6">
              <p className="text-lg text-emerald-200">Least crowded times today</p>
              <ul className="mt-3 space-y-2">
                {forecastReq.data.recommendedHours.map((h) => (
                  <li key={h} className="text-2xl font-semibold">
                    {hourRange(h)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-5 rounded-2xl bg-white p-5 text-temple-900">
            <QRCodeSVG value={`${window.location.origin}/temples/${temple.slug}`} size={110} marginSize={0} />
            <div>
              <p className="text-lg font-semibold">Book or track on your phone</p>
              <p className="text-sm text-temple-600">Scan to open this temple on Smart Darshan.</p>
              <p className="mt-2 text-sm text-temple-600">
                No smartphone? SMS <span className="font-mono font-semibold">STATUS &lt;code&gt;</span>
              </p>
            </div>
          </div>
        </aside>
      </main>

      {ticker && (
        <footer className="flex items-center overflow-hidden border-t border-white/10 bg-saffron-900/60 py-3">
          <span className="z-10 flex shrink-0 items-center gap-2 bg-saffron-900 px-6 text-lg font-semibold">
            <Megaphone className="size-5" /> Announcements
          </span>
          <div className="relative flex-1 overflow-hidden whitespace-nowrap">
            <p className="animate-ticker inline-block text-xl text-saffron-100">{ticker}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
