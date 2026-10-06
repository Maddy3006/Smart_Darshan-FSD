import { Building2, Plus, Ticket, Users, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ErrorBanner, Field, Input, Modal, PageHeader, StatCard, Toggle } from '../../components/ui.jsx';
import { useFetch, useInterval } from '../../hooks/useFetch.js';
import { api, errorMessage, storage, TEMPLE_SCOPE_KEY } from '../../lib/api.js';
import { number } from '../../lib/format.js';

const EMPTY = {
  name: '',
  deity: '',
  city: '',
  state: '',
  address: '',
  openTime: '05:00',
  closeTime: '21:00',
  admin: { name: '', email: '', phone: '', password: '' },
};

export default function SuperTemples() {
  const temples = useFetch(async () => (await api.get('/superadmin/temples')).data.temples, []);
  const overview = useFetch(async () => (await api.get('/superadmin/overview')).data.overview, []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useInterval(temples.reload, 30_000);

  const manage = (temple) => {
    storage.set(TEMPLE_SCOPE_KEY, temple._id);
    // Full reload so every console view picks up the new temple scope.
    window.location.assign('/admin');
  };

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/superadmin/temples', form);
      toast.success(`${data.temple.name} created with ${data.slotSync.created} slots`);
      setOpen(false);
      setForm(EMPTY);
      temples.reload();
      overview.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (temple, isActive) => {
    try {
      await api.patch(`/superadmin/temples/${temple._id}`, { isActive });
      toast.success(`${temple.name} ${isActive ? 'activated' : 'deactivated'}`);
      temples.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const o = overview.data;
  const setAdmin = (field) => (e) => setForm({ ...form, admin: { ...form.admin, [field]: e.target.value } });

  return (
    <div>
      <PageHeader
        title="All temples"
        subtitle="Onboard temples and monitor them across the platform."
        actions={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            Add temple
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active temples" value={o ? o.temples : '–'} icon={Building2} />
        <StatCard label="Registered devotees" value={o ? number(o.devotees) : '–'} icon={Users} tone="blue" />
        <StatCard label="Staff & admins" value={o ? number(o.staff) : '–'} icon={UserPlus} tone="gray" />
        <StatCard label="Tokens (last 24 h)" value={o ? number(o.tokensLast24h) : '–'} icon={Ticket} tone="green" />
      </div>

      <ErrorBanner message={temples.error} onRetry={temples.reload} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-temple-50 text-left text-xs text-temple-600">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Temple</th>
              <th className="px-3 py-2.5 font-semibold">Admins</th>
              <th className="px-3 py-2.5 text-right font-semibold">In queue</th>
              <th className="px-3 py-2.5 text-right font-semibold">Entered today</th>
              <th className="px-3 py-2.5 font-semibold">Active</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="tnum divide-y divide-temple-100">
            {temples.data?.map((t) => (
              <tr key={t._id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-temple-900">{t.name}</p>
                  <p className="text-xs text-temple-500">
                    {t.city}
                    {t.state ? `, ${t.state}` : ''} · {t.darshanTypes} darshan types
                  </p>
                </td>
                <td className="px-3 py-3 text-temple-600">{t.admins.map((a) => a.email).join(', ') || '–'}</td>
                <td className="px-3 py-3 text-right">
                  {t.live ? (
                    <>
                      {number(t.live.inQueue)} <Badge tone={t.live.occupancyPct >= 90 ? 'red' : 'gray'}>{t.live.occupancyPct}%</Badge>
                    </>
                  ) : (
                    '–'
                  )}
                </td>
                <td className="px-3 py-3 text-right">{t.live ? number(t.live.enteredToday) : '–'}</td>
                <td className="px-3 py-3">
                  <Toggle checked={t.isActive} onChange={(v) => toggleActive(t, v)} />
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="secondary" onClick={() => manage(t)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a temple"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="temple-form" loading={saving}>
              Create temple
            </Button>
          </>
        }
      >
        <form id="temple-form" onSubmit={create} className="space-y-5">
          <ErrorBanner message={error} />
          <p className="text-sm text-temple-600">
            The temple starts with three default darshan types. The admin can change them in Temple settings.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Temple name" className="sm:col-span-2">
              <Input required minLength={3} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Deity">
              <Input value={form.deity} onChange={(e) => setForm({ ...form, deity: e.target.value })} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="City">
              <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="Opens at">
              <Input type="time" required value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
            </Field>
            <Field label="Closes at">
              <Input type="time" required value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
            </Field>
          </div>
          <div className="rounded-xl bg-temple-50 p-4">
            <p className="mb-3 text-sm font-semibold text-temple-900">Temple admin account</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Admin name">
                <Input required value={form.admin.name} onChange={setAdmin('name')} />
              </Field>
              <Field label="Admin email">
                <Input type="email" required value={form.admin.email} onChange={setAdmin('email')} />
              </Field>
              <Field label="Phone" hint="Optional">
                <Input type="tel" value={form.admin.phone} onChange={setAdmin('phone')} />
              </Field>
              <Field label="Temporary password" hint="At least 6 characters">
                <Input required minLength={6} value={form.admin.password} onChange={setAdmin('password')} />
              </Field>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
