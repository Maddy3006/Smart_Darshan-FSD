import { BellRing, ChartColumn, QrCode, Search, Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TempleCard from '../../components/TempleCard.jsx';
import { Button, EmptyState, ErrorBanner, Input, Select } from '../../components/ui.jsx';
import { useFetch, useInterval } from '../../hooks/useFetch.js';
import { api } from '../../lib/api.js';

const STEPS = [
  { icon: Ticket, title: 'Book a darshan slot', text: 'Pick a time slot online, or get a walk-in token at the temple counter or kiosk.' },
  {
    icon: QrCode,
    title: 'Show your QR at the gate',
    text: 'Staff scan your token at entry and exit, so the queue count is always accurate.',
  },
  {
    icon: BellRing,
    title: 'Track the live queue',
    text: 'See your position and waiting time update live, with reminders before your slot.',
  },
  {
    icon: ChartColumn,
    title: 'Plan with forecasts',
    text: 'A machine-learning model predicts crowds hour by hour and suggests quieter times.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [code, setCode] = useState('');
  const { data, error, loading, reload } = useFetch(async () => (await api.get('/temples')).data, []);
  useInterval(reload, 30_000);

  const temples = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.temples || []).filter(
      (t) => (!city || t.city === city) && (!q || [t.name, t.city, t.state, t.deity].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [data, query, city]);

  return (
    <div>
      <section className="relative overflow-hidden bg-linear-to-br from-saffron-900 via-temple-900 to-temple-950 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-saffron-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.3fr_1fr] md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-saffron-300">Smart Darshan</p>
            <h1 className="mt-3 text-4xl leading-tight sm:text-5xl">Darshan without the endless wait.</h1>
            <p className="mt-4 max-w-xl text-lg text-temple-200">
              Book a time slot, skip the guesswork and watch the temple queue in real time. Plan your visit when the crowd is lowest.
            </p>
            <div className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-temple-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search temple, deity or city"
                  className="border-0 pl-9 shadow-none focus:ring-0"
                />
              </div>
              <Select value={city} onChange={(e) => setCity(e.target.value)} className="border-0 shadow-none focus:ring-0 sm:w-40">
                <option value="">All cities</option>
                {data?.cities?.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Button onClick={() => document.getElementById('temples')?.scrollIntoView({ behavior: 'smooth' })}>Find temples</Button>
            </div>
          </div>
          <div className="self-center rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="font-display text-2xl">Already have a token?</p>
            <p className="mt-1 text-sm text-temple-300">Enter your token code to see your live queue position.</p>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) navigate(`/t/${code.trim().toUpperCase()}`);
              }}
            >
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SD-XXXXXX" className="font-mono uppercase" />
              <Button type="submit">Track</Button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="card p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-saffron-50 text-saffron-700">
                <step.icon className="size-5" />
              </span>
              <p className="mt-3 text-xs font-semibold text-saffron-700">STEP {i + 1}</p>
              <p className="font-semibold text-temple-900">{step.title}</p>
              <p className="mt-1 text-sm text-temple-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="temples" className="mx-auto max-w-6xl scroll-mt-20 px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-3xl text-temple-900">Temples</h2>
            <p className="text-temple-600">Live waiting times refresh automatically.</p>
          </div>
        </div>
        <ErrorBanner message={error} onRetry={reload} />
        {loading && !data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card h-80 animate-pulse bg-temple-100/60" />
            ))}
          </div>
        ) : temples.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {temples.map((temple) => (
              <TempleCard key={temple._id} temple={temple} />
            ))}
          </div>
        ) : (
          data && <EmptyState icon={Search} title="No temples match your search" message="Try a different name or city." />
        )}
      </section>
    </div>
  );
}
