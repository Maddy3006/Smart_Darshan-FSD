import { CalendarDays, ChevronRight, Clock, Ticket, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TokenStatusBadge } from '../../components/StatusBadge.jsx';
import TokenTicket from '../../components/TokenTicket.jsx';
import { Card, EmptyState, ErrorBanner, LinkButton, PageHeader, PageLoader, Segmented } from '../../components/ui.jsx';
import { useSocketEvent } from '../../context/SocketContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../lib/api.js';
import { fmtDateStr, fmtSlot } from '../../lib/format.js';

export default function MyTokens() {
  const [scope, setScope] = useState('upcoming');
  const { data, error, loading, reload } = useFetch(
    async () => (await api.get('/tokens/mine', { params: { scope } })).data.tokens,
    [scope],
  );
  useSocketEvent('notification', () => reload());

  const [next, ...rest] = data || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title="My tokens"
        subtitle="Your darshan bookings and their live status."
        actions={
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
        }
      />
      <ErrorBanner message={error} onRetry={reload} />

      {loading && !data ? (
        <PageLoader />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={Ticket}
            title={scope === 'upcoming' ? 'No upcoming bookings' : 'No past visits yet'}
            message="Browse temples and book a darshan slot."
            action={<LinkButton to="/">Find a temple</LinkButton>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {scope === 'upcoming' && next && (
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <TokenTicket token={next} />
              <Card className="flex flex-col justify-center gap-3 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-saffron-700">Next visit</p>
                <p className="font-display text-2xl">{next.temple.name}</p>
                <p className="text-temple-600">Open live status to see your queue position and waiting time as it updates.</p>
                <LinkButton to={`/t/${next.code}`}>Track live status</LinkButton>
              </Card>
            </div>
          )}
          <div className="space-y-3">
            {(scope === 'upcoming' ? rest : data).map((token) => (
              <Link
                key={token._id}
                to={`/t/${token.code}`}
                className="card flex flex-wrap items-center justify-between gap-4 p-4 transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-temple-900">{token.code}</span>
                    <TokenStatusBadge status={token.status} />
                  </div>
                  <p className="mt-1 font-semibold text-temple-900">
                    {token.temple.name} · {token.darshanType.name}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-temple-600">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-4" /> {fmtDateStr(token.slot.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-4" /> {fmtSlot(token.slot.startAt, token.slot.endAt, token.temple.timezone)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-4" /> {token.groupSize}
                    </span>
                  </p>
                </div>
                <ChevronRight className="size-5 text-temple-400" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
