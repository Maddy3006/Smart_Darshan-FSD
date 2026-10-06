import { BellRing, CircleCheck, CirclePause, CircleX, Clock, DoorOpen, Hourglass, Printer, TriangleAlert, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { LiveDot } from '../../components/StatusBadge.jsx';
import TokenTicket from '../../components/TokenTicket.jsx';
import { Button, Card, EmptyState, LinkButton, Modal, PageLoader } from '../../components/ui.jsx';
import { useRoom, useSocket, useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch, useInterval, useThrottle } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { fmtDate, fmtTime, waitLabel } from '../../lib/format.js';

function BigStat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl bg-temple-50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-temple-500">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-temple-900">{value}</p>
    </div>
  );
}

function QueuePanel({ token, queue }) {
  const tz = token.temple.timezone;

  if (queue.state === 'in_queue') {
    return (
      <>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">You are in the queue</p>
        <p className="mt-1 text-6xl font-semibold text-temple-900">#{queue.position}</p>
        <p className="text-temple-600">position in the {token.darshanType.name} lane</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <BigStat icon={Users} label="People ahead" value={queue.peopleAhead} />
          <BigStat icon={Hourglass} label="Estimated wait" value={waitLabel(queue.waitMin)} />
        </div>
        <p className="mt-4 text-xs text-temple-500">
          Entered at {fmtTime(token.checkedInAt, tz)}. The queue is moving at about {queue.throughputPerMin} people per minute.
        </p>
      </>
    );
  }

  if (queue.state === 'upcoming' || queue.state === 'entry_open') {
    const open = queue.state === 'entry_open';
    return (
      <>
        <p className={`text-sm font-semibold uppercase tracking-wide ${open ? 'text-emerald-700' : 'text-blue-700'}`}>
          {open ? 'Entry is open. Please proceed to the gate' : 'Your slot is coming up'}
        </p>
        <p className="mt-1 text-4xl font-semibold text-temple-900">
          {queue.minutesUntilSlot > 180
            ? `${fmtDate(token.slot.startAt, tz)}, ${fmtTime(token.slot.startAt, tz)}`
            : queue.minutesUntilSlot > 0
              ? `Starts in ${waitLabel(queue.minutesUntilSlot)}`
              : 'Slot in progress'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <BigStat
            icon={DoorOpen}
            label="Entry window"
            value={`${fmtTime(queue.entryOpensAt, tz)} – ${fmtTime(queue.entryClosesAt, tz)}`}
          />
          <BigStat icon={Hourglass} label="Queue wait right now" value={waitLabel(queue.laneWaitMin)} />
        </div>
        <p className="mt-4 text-xs text-temple-500">{queue.laneInQueue} people are in this lane now. Wait times update live.</p>
      </>
    );
  }

  const endStates = {
    completed: {
      icon: CircleCheck,
      color: 'text-emerald-700',
      title: 'Darshan completed',
      text: `Thank you for visiting ${token.temple.name}.`,
    },
    cancelled: { icon: CircleX, color: 'text-temple-500', title: 'Token cancelled', text: 'The seats were released for other devotees.' },
    expired: { icon: TriangleAlert, color: 'text-red-700', title: 'Token expired', text: 'The slot was missed. Please book a new slot.' },
  };
  const end = endStates[queue.state] || endStates.completed;
  return (
    <div className="py-4 text-center">
      <end.icon className={`mx-auto size-14 ${end.color}`} />
      <p className="mt-3 text-2xl font-semibold text-temple-900">{end.title}</p>
      <p className="text-temple-600">{end.text}</p>
      <LinkButton to={`/temples/${token.temple.slug}`} variant="secondary" className="mt-5">
        View temple
      </LinkButton>
    </div>
  );
}

export default function TokenStatus() {
  const { code } = useParams();
  const { connected } = useSocket();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { data, error, loading, reload } = useFetch(async () => (await api.get(`/tokens/${code}`)).data, [code]);

  const templeId = data?.token.temple._id;
  const refresh = useThrottle(reload, 4000);
  useRoom('token', data?.token.code);
  useRoom('temple', templeId);
  useSocketEvent('token:update', (u) => u.code === data?.token.code && reload());
  useSocketEvent('live:update', (s) => String(s.templeId) === String(templeId) && refresh());
  useInterval(reload, 60_000);

  if (loading && !data) return <PageLoader label="Loading token..." />;
  if (error && !data) {
    return (
      <div className="px-4 py-16">
        <EmptyState
          icon={TriangleAlert}
          title="Token not found"
          message={`We couldn't find ${code}. Check the code and try again.`}
          action={<LinkButton to="/track">Try another code</LinkButton>}
        />
      </div>
    );
  }

  const { token, queue, isOwner } = data;

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.post(`/tokens/${token.code}/cancel`);
      toast.success('Booking cancelled');
      setConfirmCancel(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const enableAlerts = async () => {
    if (!('Notification' in window)) return toast.error('This browser does not support notifications');
    const result = await Notification.requestPermission();
    if (result === 'granted') toast.success('Alerts enabled. Keep this page open in a tab.');
    return undefined;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl">Token {token.code}</h1>
          <p className="text-sm text-temple-600">
            <Link to={`/temples/${token.temple.slug}`} className="hover:underline">
              {token.temple.name}
            </Link>
          </p>
        </div>
        <LiveDot connected={connected} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="print-area space-y-3">
          <TokenTicket token={token} />
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print ticket
            </Button>
            {'Notification' in window && Notification.permission !== 'granted' && (
              <Button variant="secondary" icon={BellRing} onClick={enableAlerts}>
                Enable alerts
              </Button>
            )}
            {isOwner && token.canCancel && (
              <Button variant="ghost" className="text-red-700" onClick={() => setConfirmCancel(true)}>
                Cancel booking
              </Button>
            )}
          </div>
        </div>

        <Card className="no-print p-6">
          {queue.entryPaused && ['upcoming', 'entry_open', 'in_queue'].includes(queue.state) && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              <CirclePause className="mt-0.5 size-4 shrink-0" />
              Entry is paused for crowd control. {queue.pauseReason}
            </div>
          )}
          <QueuePanel token={token} queue={queue} />
          <p className="mt-6 flex items-center gap-1.5 border-t border-temple-100 pt-4 text-xs text-temple-500">
            <Clock className="size-3.5" /> Updates automatically. No smartphone? SMS &quot;STATUS {token.code}&quot; for the same
            information.
          </p>
        </Card>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this booking?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep booking
            </Button>
            <Button variant="danger" loading={cancelling} onClick={cancel}>
              Cancel booking
            </Button>
          </>
        }
      >
        <p className="text-sm text-temple-700">
          Your {token.groupSize} {token.groupSize === 1 ? 'seat' : 'seats'} will be released for other devotees. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
