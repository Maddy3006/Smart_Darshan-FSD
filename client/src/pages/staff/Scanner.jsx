import { CircleCheck, CircleX, DoorClosed, DoorOpen, Keyboard, RefreshCw, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import LiveLanes from '../../components/LiveLanes.jsx';
import QrScanner from '../../components/QrScanner.jsx';
import { TokenStatusBadge } from '../../components/StatusBadge.jsx';
import { Button, Card, CardHeader, cx, Input, PageHeader, Segmented } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api, errorMessage } from '../../lib/api.js';
import { fmtSlot, relativeTime } from '../../lib/format.js';
import { beep } from '../../lib/sound.js';

const DUPLICATE_WINDOW_MS = 4000;

function ScanResult({ result, timezone }) {
  if (!result) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-temple-200 p-6 text-center text-temple-500">
        Scan a token to see the result here.
      </div>
    );
  }
  const { ok, message, token } = result;
  return (
    <div className={cx('rounded-2xl p-5', ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')} role="status" aria-live="assertive">
      <div className="flex items-center gap-3">
        {ok ? <CircleCheck className="size-10 shrink-0" /> : <CircleX className="size-10 shrink-0" />}
        <div>
          <p className="text-2xl font-semibold">{ok ? message : 'Not allowed'}</p>
          {!ok && <p className="text-white/90">{message}</p>}
        </div>
      </div>
      {token && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-black/15 p-4 text-sm">
          <div>
            <p className="text-white/70">Token</p>
            <p className="font-mono text-lg font-semibold">{token.code}</p>
          </div>
          <div>
            <p className="text-white/70">People</p>
            <p className="flex items-center gap-1.5 text-lg font-semibold">
              <Users className="size-4" /> {token.groupSize}
            </p>
          </div>
          <div>
            <p className="text-white/70">Devotee</p>
            <p className="font-semibold">{token.name}</p>
          </div>
          <div>
            <p className="text-white/70">Darshan</p>
            <p className="font-semibold">{token.darshanType.name}</p>
          </div>
          <div className="col-span-2">
            <p className="text-white/70">Slot</p>
            <p className="font-semibold">{fmtSlot(token.slot.startAt, token.slot.endAt, timezone)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scanner() {
  const { temple } = useOutletContext();
  const live = useLiveTemple(temple._id);
  const [mode, setMode] = useState('entry');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const lastScan = useRef({ code: '', at: 0 });

  const recent = useFetch(async () => (await api.get('/staff/tokens', { params: { sort: 'recent', limit: 12 } })).data.tokens, []);

  const scan = async (raw) => {
    const code = String(raw).trim();
    if (!code || busy) return;
    const now = Date.now();
    if (lastScan.current.code === code && now - lastScan.current.at < DUPLICATE_WINDOW_MS) return;
    lastScan.current = { code, at: now };

    setBusy(true);
    try {
      const { data } = await api.post('/staff/scan', { code, action: mode });
      setResult({ ok: true, message: data.message, token: data.token });
      beep('success');
      recent.reload();
    } catch (err) {
      setResult({ ok: false, message: errorMessage(err), token: err.response?.data?.error?.details?.token });
      beep('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="QR gate scanner"
        subtitle="Scan tokens at the entry gate to add devotees to the queue, and at the exit gate to remove them."
        actions={
          <Segmented
            size="lg"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setResult(null);
              lastScan.current = { code: '', at: 0 };
            }}
            options={[
              { value: 'entry', label: 'Entry gate', icon: DoorOpen, activeClass: 'bg-emerald-700 text-white shadow-sm' },
              { value: 'exit', label: 'Exit gate', icon: DoorClosed, activeClass: 'bg-blue-700 text-white shadow-sm' },
            ]}
          />
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <QrScanner onScan={scan} />
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                lastScan.current = { code: '', at: 0 };
                scan(manualCode.toUpperCase());
                setManualCode('');
              }}
            >
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-temple-400" />
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Or type token code, e.g. SD-7K4P9Q"
                  className="pl-9 font-mono uppercase placeholder:font-sans placeholder:normal-case"
                />
              </div>
              <Button
                type="submit"
                loading={busy}
                variant={mode === 'entry' ? 'success' : 'primary'}
                className={mode === 'exit' ? 'bg-blue-700 hover:bg-blue-800' : ''}
              >
                {mode === 'entry' ? 'Record entry' : 'Record exit'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <ScanResult result={result} timezone={temple.timezone} />
          <Card>
            <CardHeader
              title="Recent tokens"
              subtitle="Today at this temple"
              actions={
                <Button size="sm" variant="ghost" icon={RefreshCw} onClick={recent.reload}>
                  Refresh
                </Button>
              }
            />
            <ul className="max-h-80 divide-y divide-temple-100 overflow-y-auto">
              {recent.data?.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-temple-900">{t.code}</p>
                    <p className="truncate text-temple-500">
                      {t.name} · {t.darshanType.name} · {t.groupSize} ppl
                    </p>
                  </div>
                  <div className="text-right">
                    <TokenStatusBadge status={t.status} />
                    <p className="mt-0.5 text-xs text-temple-400">{relativeTime(t.completedAt || t.checkedInAt || t.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-xl">Live queue</h2>
      <LiveLanes live={live} timezone={temple.timezone} showThroughput />
    </div>
  );
}
