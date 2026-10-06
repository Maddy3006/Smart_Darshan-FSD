import { Accessibility, CalendarPlus, Pencil, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, PageLoader, Textarea, Toggle } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { fmtDateStr, rupees, todayIn } from '../../lib/format.js';

const SETTING_FIELDS = [
  { key: 'maxOccupancy', label: 'Safe queue limit (people)', hint: 'Alerts fire at 90% and 100% of this' },
  { key: 'bookingWindowDays', label: 'Booking window (days)', hint: 'How far ahead devotees can book' },
  { key: 'maxGroupSize', label: 'Max people per token' },
  { key: 'maxBookingsPerUserPerDay', label: 'Bookings per devotee per day' },
  { key: 'checkinEarlyMin', label: 'Entry opens before slot (min)' },
  { key: 'checkinLateMin', label: 'Entry closes after slot (min)' },
  { key: 'walkinReleaseMin', label: 'Release unsold online seats to walk-ins (min before slot)' },
  { key: 'reminderBeforeMin', label: 'Reminder before slot (min)' },
  { key: 'autoCompleteAfterMin', label: 'Auto-complete if no exit scan (min)' },
  { key: 'festivalCapacityMultiplier', label: 'Festival capacity multiplier', step: '0.1' },
];

const EMPTY_TYPE = {
  name: '',
  description: '',
  price: 0,
  slotMinutes: 30,
  capacityPerSlot: 100,
  walkinPercent: 40,
  isPriority: false,
  active: true,
};

function slotSyncMessage(sync) {
  return sync ? ` Slots: ${sync.created} created, ${sync.updated} updated, ${sync.removed} removed.` : '';
}

export default function Settings() {
  const { reloadTemple } = useOutletContext();
  const { data: temple, setData, loading } = useFetch(async () => (await api.get('/admin/temple')).data.temple, []);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [festival, setFestival] = useState({ name: '', date: '' });
  const [editingType, setEditingType] = useState(null);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    if (!temple) return;
    const { name, deity, description, address, city, state, imageUrl, openTime, closeTime } = temple;
    setProfile({ name, deity, description, address, city, state, imageUrl, openTime, closeTime });
    setSettings(temple.settings);
  }, [temple]);

  if (loading || !temple || !profile || !settings) return <PageLoader />;

  const save = async (section, body, message) => {
    setSaving(section);
    try {
      const { data } = await api.patch('/admin/temple', body);
      setData(data.temple);
      reloadTemple();
      toast.success(message + slotSyncMessage(data.slotSync));
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    } finally {
      setSaving('');
    }
  };

  const saveType = async () => {
    setSaving('type');
    try {
      const { _id, ...body } = editingType;
      const { data } = _id
        ? await api.patch(`/admin/temple/darshan-types/${_id}`, body)
        : await api.post('/admin/temple/darshan-types', body);
      setData(data.temple);
      reloadTemple();
      toast.success(`Darshan type saved.${slotSyncMessage(data.slotSync)}`);
      setEditingType(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving('');
    }
  };

  const today = todayIn(temple.timezone);
  const upcomingFestivals = temple.festivals.filter((f) => f.date >= today);

  return (
    <div className="space-y-6">
      <PageHeader title="Temple settings" subtitle="Changes to timings, capacity and festivals update future slots automatically." />

      <Card>
        <CardHeader title="Temple profile & timings" />
        <form
          className="grid gap-4 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save('profile', profile, 'Profile saved.');
          }}
        >
          <Field label="Temple name">
            <Input required value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </Field>
          <Field label="Presiding deity">
            <Input value={profile.deity} onChange={(e) => setProfile({ ...profile, deity: e.target.value })} />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} />
          </Field>
          <Field label="Address">
            <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <Input required value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </Field>
            <Field label="State">
              <Input value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
            </Field>
          </div>
          <Field label="Image URL" hint="Optional banner image">
            <Input type="url" value={profile.imageUrl} onChange={(e) => setProfile({ ...profile, imageUrl: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Opens at">
              <Input type="time" required value={profile.openTime} onChange={(e) => setProfile({ ...profile, openTime: e.target.value })} />
            </Field>
            <Field label="Closes at" hint="24:00 is not supported by the picker; use 23:59">
              <Input
                type="time"
                required
                value={profile.closeTime === '24:00' ? '23:59' : profile.closeTime}
                onChange={(e) => setProfile({ ...profile, closeTime: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" icon={Save} loading={saving === 'profile'}>
              Save profile
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Crowd & booking rules" />
        <form
          className="p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save('settings', { settings }, 'Rules saved.');
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SETTING_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <Input
                  type="number"
                  min="0"
                  step={f.step || '1'}
                  required
                  value={settings[f.key]}
                  onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
          <div className="mt-5">
            <Toggle
              checked={settings.autoPauseAtCapacity}
              onChange={(v) => setSettings({ ...settings, autoPauseAtCapacity: v })}
              label="Automatically pause entry when the queue reaches the safe limit"
              description="Admins can resume entry from the dashboard."
            />
          </div>
          <Button type="submit" icon={Save} loading={saving === 'settings'} className="mt-5">
            Save rules
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="Darshan types"
          subtitle="Each type has its own slots and its own queue lane."
          actions={
            <Button size="sm" icon={Plus} onClick={() => setEditingType(EMPTY_TYPE)}>
              Add type
            </Button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-temple-50 text-left text-xs text-temple-600">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Price</th>
                <th className="px-3 py-2.5 text-right font-semibold">Slot</th>
                <th className="px-3 py-2.5 text-right font-semibold">Capacity / slot</th>
                <th className="px-3 py-2.5 text-right font-semibold">Walk-in share</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-temple-100">
              {temple.darshanTypes.map((dt) => (
                <tr key={dt._id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{dt.name}</p>
                    {dt.isPriority && (
                      <Badge tone="violet" icon={Accessibility}>
                        Priority lane
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-3">{rupees(dt.price)}</td>
                  <td className="px-3 py-3 text-right">{dt.slotMinutes} min</td>
                  <td className="px-3 py-3 text-right">{dt.capacityPerSlot}</td>
                  <td className="px-3 py-3 text-right">{dt.walkinPercent}%</td>
                  <td className="px-3 py-3">{dt.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditingType({ ...dt })}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Festival calendar"
          subtitle="Festival days get extra slot capacity and are used by the crowd forecast."
          icon={Sparkles}
        />
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_1.4fr]">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const festivals = [...temple.festivals.map(({ name, date }) => ({ name, date })), festival];
              if (await save('festival', { festivals }, `${festival.name} added.`)) setFestival({ name: '', date: '' });
            }}
          >
            <Field label="Festival name">
              <Input
                required
                value={festival.name}
                onChange={(e) => setFestival({ ...festival, name: e.target.value })}
                placeholder="e.g. Maha Shivaratri"
              />
            </Field>
            <Field label="Date">
              <Input
                type="date"
                required
                min={today}
                value={festival.date}
                onChange={(e) => setFestival({ ...festival, date: e.target.value })}
              />
            </Field>
            <Button type="submit" icon={CalendarPlus} loading={saving === 'festival'}>
              Add festival
            </Button>
          </form>
          <ul className="max-h-72 divide-y divide-temple-100 overflow-y-auto rounded-xl border border-temple-100">
            {upcomingFestivals.map((f) => (
              <li key={`${f.date}-${f.name}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{f.name}</span>
                  <span className="ml-2 text-temple-500">
                    {fmtDateStr(f.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </span>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-temple-500 hover:bg-red-50 hover:text-red-700"
                  title="Remove"
                  onClick={() =>
                    save(
                      'festival',
                      {
                        festivals: temple.festivals
                          .filter((x) => !(x.date === f.date && x.name === f.name))
                          .map(({ name, date }) => ({ name, date })),
                      },
                      `${f.name} removed.`,
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            {!upcomingFestivals.length && <li className="px-4 py-8 text-center text-sm text-temple-500">No upcoming festivals.</li>}
          </ul>
        </div>
      </Card>

      <Modal
        open={Boolean(editingType)}
        onClose={() => setEditingType(null)}
        title={editingType?._id ? 'Edit darshan type' : 'Add darshan type'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingType(null)}>
              Cancel
            </Button>
            <Button loading={saving === 'type'} onClick={saveType} disabled={!editingType?.name || editingType.name.trim().length < 2}>
              Save
            </Button>
          </>
        }
      >
        {editingType && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input value={editingType.name} onChange={(e) => setEditingType({ ...editingType, name: e.target.value })} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Input value={editingType.description} onChange={(e) => setEditingType({ ...editingType, description: e.target.value })} />
            </Field>
            <Field label="Price (₹)" hint="0 for free darshan">
              <Input
                type="number"
                min="0"
                value={editingType.price}
                onChange={(e) => setEditingType({ ...editingType, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Slot length (minutes)">
              <Input
                type="number"
                min="10"
                max="240"
                value={editingType.slotMinutes}
                onChange={(e) => setEditingType({ ...editingType, slotMinutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="Capacity per slot" hint="People the gate can admit per slot">
              <Input
                type="number"
                min="1"
                value={editingType.capacityPerSlot}
                onChange={(e) => setEditingType({ ...editingType, capacityPerSlot: Number(e.target.value) })}
              />
            </Field>
            <Field label="Walk-in share (%)" hint="Held back from online booking">
              <Input
                type="number"
                min="0"
                max="100"
                value={editingType.walkinPercent}
                onChange={(e) => setEditingType({ ...editingType, walkinPercent: Number(e.target.value) })}
              />
            </Field>
            <div className="space-y-3 sm:col-span-2">
              <Toggle
                checked={editingType.isPriority}
                onChange={(v) => setEditingType({ ...editingType, isPriority: v })}
                label="Priority lane"
                description="For senior citizens and differently-abled devotees"
              />
              <Toggle
                checked={editingType.active}
                onChange={(v) => setEditingType({ ...editingType, active: v })}
                label="Active"
                description="Inactive types get no new slots"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
