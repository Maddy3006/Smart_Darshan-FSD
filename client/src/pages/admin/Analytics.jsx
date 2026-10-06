import { Brain, CalendarDays, RefreshCw, Sparkles, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import ForecastChart from '../../components/charts/ForecastChart.jsx';
import { DailyTrendChart, FeatureImportance, WeekHeatmap } from '../../components/charts/TrendCharts.jsx';
import { Badge, Button, Card, CardHeader, cx, ErrorBanner, PageHeader, Segmented, StatCard } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { fmtDateStr, fmtDateTime, hourLabel, hourRange, number, WEEKDAYS } from '../../lib/format.js';

export default function Analytics() {
  const { temple } = useOutletContext();
  const [days, setDays] = useState(30);
  const [selectedDay, setSelectedDay] = useState(0);
  const [training, setTraining] = useState(false);

  const model = useFetch(async () => (await api.get('/admin/forecast/model')).data, []);
  const week = useFetch(async () => (await api.get('/admin/forecast/week')).data.days, []);
  const trends = useFetch(async () => (await api.get('/admin/stats/trends', { params: { days } })).data.trends, [days]);

  const retrain = async () => {
    setTraining(true);
    try {
      const { data } = await api.post('/admin/forecast/train');
      toast.success(`Model retrained: R² ${data.model.r2}, MAE ${data.model.mae}`);
      model.reload();
      week.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setTraining(false);
    }
  };

  const m = model.data?.model;
  const service = model.data?.service;
  const t = trends.data;
  const day = week.data?.[selectedDay];

  return (
    <div>
      <PageHeader title="Analytics & forecast" subtitle={`Crowd trend analysis and ML predictions for ${temple.name}.`} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader
            title="Prediction model"
            subtitle="Random Forest regressor trained on hourly footfall (Python, scikit-learn)"
            icon={Brain}
            actions={
              <Button size="sm" icon={RefreshCw} loading={training} onClick={retrain} disabled={!service?.online}>
                Retrain
              </Button>
            }
          />
          <div className="space-y-5 p-5">
            <p className={cx('flex items-center gap-2 text-sm font-medium', service?.online ? 'text-emerald-700' : 'text-red-700')}>
              {service?.online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
              {service
                ? service.online
                  ? 'Prediction service online'
                  : 'Prediction service offline. Forecasts use historical averages.'
                : 'Checking service...'}
            </p>
            {m ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-temple-50 p-3">
                    <p className="text-xs text-temple-500">R² score (test set)</p>
                    <p className="text-2xl font-semibold">{m.r2}</p>
                  </div>
                  <div className="rounded-xl bg-temple-50 p-3">
                    <p className="text-xs text-temple-500">Mean absolute error</p>
                    <p className="text-2xl font-semibold">±{number(Math.round(m.mae))}</p>
                    <p className="text-xs text-temple-500">visitors per hour</p>
                  </div>
                  <div className="rounded-xl bg-temple-50 p-3">
                    <p className="text-xs text-temple-500">vs. weekday-hour average</p>
                    <p className="text-2xl font-semibold">
                      {m.improvementPct != null ? `${m.improvementPct > 0 ? '−' : '+'}${Math.abs(m.improvementPct)}%` : '–'}
                    </p>
                    <p className="text-xs text-temple-500">error (baseline MAE {m.baselineMae ?? '–'})</p>
                  </div>
                  <div className="rounded-xl bg-temple-50 p-3">
                    <p className="text-xs text-temple-500">Training records</p>
                    <p className="text-2xl font-semibold">{number(m.samples)}</p>
                    <p className="text-xs text-temple-500">trained {fmtDateTime(m.trainedAt, temple.timezone)}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-temple-800">What drives the prediction</p>
                  <FeatureImportance importances={m.featureImportances} />
                </div>
              </>
            ) : (
              <p className="text-sm text-temple-500">No model trained yet. Start the Python service and click Retrain.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="7-day crowd forecast"
            icon={CalendarDays}
            subtitle="Expected visitors per day. Select a day for the hourly view."
          />
          <div className="p-5">
            <ErrorBanner message={week.error} onRetry={week.reload} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {week.data?.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={cx(
                    'rounded-xl border p-2.5 text-left transition',
                    i === selectedDay ? 'border-saffron-700 bg-saffron-50 ring-2 ring-saffron-200' : 'border-temple-200 hover:bg-temple-50',
                  )}
                >
                  <p className="text-xs text-temple-500">{i === 0 ? 'Today' : fmtDateStr(d.date, { weekday: 'short', day: 'numeric' })}</p>
                  <p className="text-lg font-semibold">{number(d.expectedTotal)}</p>
                  <p className="text-[11px] text-temple-500">peak {d.peakHour != null ? hourLabel(d.peakHour) : '–'}</p>
                  {d.festival && <Sparkles className="mt-0.5 size-3 text-saffron-700" aria-label={d.festival} />}
                </button>
              ))}
            </div>
            {day && (
              <div className="mt-5">
                <p className="mb-2 flex flex-wrap items-center gap-2 text-sm text-temple-700">
                  <span className="font-semibold">{fmtDateStr(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  {day.festival && <Badge tone="saffron">{day.festival}</Badge>}
                  <span className="text-temple-500">Recommended: {day.recommendedHours.map(hourRange).join(', ') || '–'}</span>
                </p>
                <ForecastChart hours={day.hours} recommendedHours={day.recommendedHours} height={220} />
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Crowd trends</h2>
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: 30, label: '30 days' },
            { value: 60, label: '60 days' },
            { value: 90, label: '90 days' },
          ]}
        />
      </div>
      <ErrorBanner message={trends.error} onRetry={trends.reload} />

      <div className={cx('space-y-6', trends.loading && 'opacity-70 transition')}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Average visitors / day"
            value={t ? number(t.summary.avgDaily) : '–'}
            icon={TrendingUp}
            hint={t && `${number(t.summary.totalVisitors)} in ${days} days`}
          />
          <StatCard
            label="Weekday vs weekend"
            value={t ? `${number(t.summary.weekdayAvg)} / ${number(t.summary.weekendAvg)}` : '–'}
            icon={CalendarDays}
            tone="blue"
            hint="Average visitors per day"
          />
          <StatCard
            label="Festival day average"
            value={t?.summary.festivalAvg ? number(t.summary.festivalAvg) : '–'}
            icon={Sparkles}
            tone="saffron"
            hint="Visitors per festival day"
          />
          <StatCard
            label="Busiest time"
            value={t?.summary.busiestSlot ? `${WEEKDAYS[t.summary.busiestSlot.dayOfWeek]} ${hourLabel(t.summary.busiestSlot.hour)}` : '–'}
            icon={TrendingUp}
            tone="red"
            hint={
              t?.summary.quietestSlot && `Quietest: ${WEEKDAYS[t.summary.quietestSlot.dayOfWeek]} ${hourLabel(t.summary.quietestSlot.hour)}`
            }
          />
        </div>

        <Card>
          <CardHeader title="Daily visitors" subtitle={t && `${fmtDateStr(t.from)} to ${fmtDateStr(t.to)}`} />
          <div className="p-5">{t && <DailyTrendChart daily={t.daily} />}</div>
        </Card>

        <Card>
          <CardHeader title="When is it busiest?" subtitle="Average visitors by day of week and hour" />
          <div className="p-5">{t && <WeekHeatmap heatmap={t.heatmap} />}</div>
        </Card>
      </div>
    </div>
  );
}
