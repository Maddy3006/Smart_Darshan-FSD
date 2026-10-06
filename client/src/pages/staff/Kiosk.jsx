import { Accessibility, ArrowLeft, Hourglass, Landmark, Printer, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PausedBanner } from '../../components/LiveLanes.jsx';
import TokenSlip from '../../components/TokenSlip.jsx';
import { Button, cx, Input, PageLoader, Stepper } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useLiveTemple } from '../../hooks/useLiveTemple.js';
import { api, errorMessage } from '../../lib/api.js';
import { rupees, waitLabel } from '../../lib/format.js';

const IDLE_RESET_MS = 45_000;

/**
 * Touch-friendly self-service kiosk at the temple entrance.
 * The device is logged in with a staff account; devotees only tap through the steps.
 */
export default function Kiosk() {
  const ctx = useFetch(async () => (await api.get('/staff/context')).data.temple, []);
  const temple = ctx.data;
  const live = useLiveTemple(temple?._id);
  const [step, setStep] = useState('welcome');
  const [darshanType, setDarshanType] = useState(null);
  const [groupSize, setGroupSize] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep('welcome');
    setDarshanType(null);
    setGroupSize(1);
    setName('');
    setPhone('');
    setToken(null);
    setError('');
  };

  // Return to the start screen when the kiosk is left idle mid-flow.
  useEffect(() => {
    if (step === 'welcome') return undefined;
    const timer = setTimeout(reset, IDLE_RESET_MS);
    return () => clearTimeout(timer);
  }, [step, groupSize, name, phone, darshanType]);

  if (ctx.error) return <div className="grid min-h-screen place-items-center p-6 text-center">{ctx.error}</div>;
  if (!temple) return <PageLoader />;

  const issue = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/staff/walkin', {
        darshanTypeId: darshanType._id,
        groupSize,
        name: name.trim() || 'Walk-in Devotee',
        phone,
      });
      setToken(data.token);
      setStep('done');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-temple-50 to-saffron-50">
      <header className="no-print flex items-center justify-between bg-temple-900 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <Landmark className="size-8 text-saffron-300" />
          <div>
            <p className="font-display text-2xl">{temple.name}</p>
            <p className="text-sm text-temple-300">Self-service darshan token kiosk</p>
          </div>
        </div>
        <Link to="/staff/walkin" className="rounded-lg p-2 text-temple-400 hover:bg-white/10" title="Exit kiosk mode">
          <X className="size-6" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 p-6">
        <PausedBanner live={live} className="no-print text-lg" />

        {step === 'welcome' && (
          <button
            type="button"
            onClick={() => setStep('type')}
            className="rounded-3xl bg-saffron-700 px-8 py-16 text-center text-white shadow-xl transition hover:bg-saffron-800"
          >
            <p className="font-display text-5xl">Namaskaram</p>
            <p className="mt-4 text-2xl">Tap here to get your darshan token</p>
            <p className="mt-2 text-saffron-100">No registration needed</p>
          </button>
        )}

        {step === 'type' && (
          <>
            <h1 className="text-center text-4xl">Choose your darshan</h1>
            <div className="grid gap-4 md:grid-cols-3">
              {temple.darshanTypes.map((dt) => {
                const lane = live?.lanes.find((l) => l.darshanTypeId === dt._id);
                return (
                  <button
                    key={dt._id}
                    type="button"
                    onClick={() => {
                      setDarshanType(dt);
                      setStep('people');
                    }}
                    className="card flex flex-col items-start gap-2 p-6 text-left transition hover:border-saffron-500 hover:shadow-lg"
                  >
                    <p className="text-2xl font-semibold text-temple-900">{dt.name}</p>
                    <p className="text-xl font-semibold text-saffron-800">{rupees(dt.price)}</p>
                    {lane && (
                      <p className="flex items-center gap-2 text-lg text-temple-600">
                        <Hourglass className="size-5" /> Wait {waitLabel(lane.waitMin)}
                      </p>
                    )}
                    {dt.isPriority && (
                      <p className="flex items-center gap-2 text-violet-700">
                        <Accessibility className="size-5" /> Seniors & differently-abled
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'people' && darshanType && (
          <div className="card space-y-6 p-8 text-center">
            <h1 className="text-4xl">How many people?</h1>
            <p className="text-lg text-temple-600">{darshanType.name}</p>
            <div className="flex justify-center">
              <Stepper size="lg" value={groupSize} onChange={setGroupSize} max={temple.settings.maxGroupSize} />
            </div>
            <div className="mx-auto grid max-w-lg gap-3 text-left sm:grid-cols-2">
              <Input className="h-14 text-lg" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input
                className="h-14 text-lg"
                type="tel"
                placeholder="Mobile for SMS (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error && <p className="text-lg font-medium text-red-700">{error}</p>}
            <div className="flex justify-center gap-3">
              <Button size="xl" variant="secondary" icon={ArrowLeft} onClick={() => setStep('type')}>
                Back
              </Button>
              <Button size="xl" loading={submitting} onClick={issue}>
                Get my token
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && token && (
          <div className="space-y-5 text-center">
            <h1 className="no-print text-4xl text-emerald-800">Your token is ready</h1>
            <TokenSlip token={token} className="max-w-sm" />
            <div className={cx('no-print flex justify-center gap-3')}>
              <Button size="xl" icon={Printer} onClick={() => window.print()}>
                Print
              </Button>
              <Button size="xl" variant="secondary" onClick={reset}>
                Done
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
