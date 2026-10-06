import {
  Bell,
  CirclePause,
  CirclePlay,
  DoorOpen,
  Hourglass,
  LogOut as ExitIcon,
  Monitor,
  ScanLine,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import ForecastChart from '../../components/charts/ForecastChart.jsx';
import CrowdMeter from '../../components/CrowdMeter.jsx';
import LiveLanes from '../../components/LiveLanes.jsx';
import { Badge, Button, Card, CardHeader, cx, Field, Input, LinkButton, Modal, PageHeader, StatCard } from '../../components/ui.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch, useInterval, useThrottle } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api, errorMessage } from '../../lib/api.js';
import { currentHourIn, number, relativeTime, waitLabel } from '../../lib/format.js';

export default function Dashboard() {
  const { temple, reloadTemple, clearAlerts } = useOutletContext();
  const live = useLiveTemple(temple._id);
  const stats = useFetch(async () => (await api.get('/admin/stats/today')).data.stats, []);
  const alerts = useFetch(async () => (await api.get('/admin/alerts')).data.alerts, []);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshStats = useThrottle(stats.reload, 15_000);
  useSocketEvent('live:update', (s) => String(s.templeId) === String(temple._id) && refreshStats());
  useSocketEvent('alert:new', (alert) => alerts.setData((list) => [alert, ...(list || [])]));
  useInterval(stats.reload, 60_000);

  useEffect(() => {
    if (window.location.hash === '#alerts') document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const setPaused = async (entryPaused) => {
    setSaving(true);
    try {
      await api.patch('/admin/controls', { entryPaused, pauseReason });
      toast.success(entryPaused ? 'Entry paused at all gates' : 'Entry resumed');
      setPauseOpen(false);
      setPauseReason('');
      reloadTemple();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const acknowledge = async () => {
    await api.post('/admin/alerts/acknowledge');
    alerts.setData((list) => list.map((a) => ({ ...a, acknowledged: true })));
    clearAlerts();
  };

  const totals = live?.totals;
  const s = stats.data;
  const tz = temple.timezone;

  return (
    <div>
      <PageHeader
        title="Crowd dashboard"
        subtitle="Live queue, today's footfall and crowd controls."
        badge={
          live?.festival && (
            <Badge tone="saffron" icon={Sparkles}>
              {live.festival}
            </Badge>
          )
        }
        actions={
          <>
            <LinkButton to={`/display/${temple.slug}`} target="_blank" variant="secondary" icon={Monitor}>
              Display board
            </LinkButton>
            {live?.entryPaused ? (
              <Button variant="success" icon={CirclePlay} loading={saving} onClick={() => setPaused(false)}>
                Resume entry
              </Button>
            ) : (
              <Button variant="danger" icon={CirclePause} onClick={() => setPauseOpen(true)}>
                Pause entry
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="People in queue"
          value={totals ? number(totals.inQueue) : '–'}
          icon={Users}
          hint={totals && `${totals.occupancyPct}% of safe limit`}
        />
        <StatCard
          label="General lane wait"
          value={totals ? waitLabel(totals.generalWaitMin) : '–'}
          icon={Hourglass}
          tone="blue"
          hint="Live estimate"
        />
        <StatCard
          label="Entered today"
          value={totals ? number(totals.enteredToday) : '–'}
          icon={DoorOpen}
          tone="green"
          hint={s && `Expected ${number(s.hourly.reduce((sum, h) => sum + h.predicted, 0))} today`}
        />
        <StatCard
          label="Tokens today"
          value={s ? number(s.tokens.total) : '–'}
          icon={Ticket}
          tone="gray"
          hint={s && `${number(s.tokens.bySource.online)} online · ${number(s.tokens.bySource.walkin)} walk-in people`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Queue occupancy" subtitle="Alerts at 90% and 100% of the safe limit" />
          <div className="p-5">
            {totals ? (
              <CrowdMeter inQueue={totals.inQueue} maxOccupancy={totals.maxOccupancy} occupancyPct={totals.occupancyPct} />
            ) : (
              <div className="h-24 animate-pulse rounded-lg bg-temple-100" />
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-temple-50 p-3">
                <p className="flex items-center gap-1.5 text-temple-500">
                  <ExitIcon className="size-4" /> Completed today
                </p>
                <p className="mt-1 text-xl font-semibold">{totals ? number(totals.completedToday) : '–'}</p>
              </div>
              <div className="rounded-xl bg-temple-50 p-3">
                <p className="flex items-center gap-1.5 text-temple-500">
                  <ScanLine className="size-4" /> Status
                </p>
                <p className={cx('mt-1 text-xl font-semibold', live?.entryPaused ? 'text-red-700' : 'text-emerald-700')}>
                  {live ? (live.entryPaused ? 'Entry paused' : live.isOpen ? 'Admitting' : 'Closed') : '–'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Today: actual entries vs forecast"
            subtitle={
              s
                ? s.forecastSource === 'ml-model'
                  ? 'Forecast from the trained Random Forest model'
                  : 'Forecast from historical averages (ML service offline)'
                : ' '
            }
          />
          <div className={cx('p-5', stats.loading && 'opacity-70')}>
            <ForecastChart hours={s?.hourly} showActual currentHour={currentHourIn(tz)} height={250} />
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-xl">Live lanes</h2>
      <LiveLanes live={live} timezone={tz} showThroughput />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Slot bookings today" subtitle="People booked against slot capacity" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-temple-50 text-left text-xs text-temple-600">
                <tr>
                  <th className="px-5 py-2 font-semibold">Darshan type</th>
                  <th className="px-3 py-2 text-right font-semibold">Online</th>
                  <th className="px-3 py-2 text-right font-semibold">Walk-in</th>
                  <th className="px-3 py-2 text-right font-semibold">Capacity</th>
                  <th className="px-5 py-2 font-semibold">Utilisation</th>
                </tr>
              </thead>
              <tbody className="tnum divide-y divide-temple-100">
                {s?.lanes.map((lane) => (
                  <tr key={lane.darshanTypeId}>
                    <td className="px-5 py-2.5 font-medium">{lane.name}</td>
                    <td className="px-3 py-2.5 text-right">{number(lane.onlineBooked)}</td>
                    <td className="px-3 py-2.5 text-right">{number(lane.walkinBooked)}</td>
                    <td className="px-3 py-2.5 text-right">{number(lane.capacity)}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-24 rounded-full bg-temple-100">
                          <span
                            className="block h-full rounded-full bg-saffron-700"
                            style={{ width: `${Math.min(100, lane.utilizationPct)}%` }}
                          />
                        </span>
                        {lane.utilizationPct}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id="alerts" className="scroll-mt-20">
          <CardHeader
            title="Crowd alerts"
            icon={Bell}
            actions={
              alerts.data?.some((a) => !a.acknowledged) && (
                <Button size="sm" variant="secondary" onClick={acknowledge}>
                  Mark all read
                </Button>
              )
            }
          />
          <ul className="max-h-72 divide-y divide-temple-100 overflow-y-auto">
            {alerts.data?.length ? (
              alerts.data.map((a) => (
                <li key={a._id} className={cx('flex gap-3 px-5 py-3 text-sm', !a.acknowledged && 'bg-amber-50/60')}>
                  <Badge tone={a.level === 'critical' ? 'red' : a.level === 'warning' ? 'amber' : 'blue'}>{a.level}</Badge>
                  <div className="min-w-0">
                    <p className="text-temple-800">{a.message}</p>
                    <p className="text-xs text-temple-500">{relativeTime(a.createdAt)}</p>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-5 py-8 text-center text-sm text-temple-500">No alerts. The queue has stayed within safe limits.</li>
            )}
          </ul>
        </Card>
      </div>

      <Modal
        open={pauseOpen}
        onClose={() => setPauseOpen(false)}
        title="Pause entry at all gates?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPauseOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={() => setPaused(true)}>
              Pause entry
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-temple-700">
          Entry scans will be refused until you resume. Devotees see the reason on their phones and on the display board.
        </p>
        <Field label="Reason shown to devotees" htmlFor="reason">
          <Input
            id="reason"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="e.g. Special pooja in progress, entry resumes at 11:30 AM"
          />
        </Field>
      </Modal>
    </div>
  );
}
