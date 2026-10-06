import { Megaphone, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, CardHeader, cx, Field, PageHeader, Segmented, Textarea, Toggle } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { relativeTime } from '../../lib/format.js';

const TYPE_TONES = { info: 'blue', warning: 'amber', urgent: 'red' };

export default function Announcements() {
  const { data, reload, setData } = useFetch(async () => (await api.get('/admin/announcements')).data.announcements, []);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);

  const publish = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/admin/announcements', { message, type });
      toast.success('Announcement published to the temple page and display boards');
      setMessage('');
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const toggle = async (announcement, isActive) => {
    setData((list) => list.map((a) => (a._id === announcement._id ? { ...a, isActive } : a)));
    try {
      await api.patch(`/admin/announcements/${announcement._id}`, { isActive });
    } catch (err) {
      toast.error(errorMessage(err));
      reload();
    }
  };

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Messages appear instantly on the temple page and the entry display boards." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card className="self-start">
          <CardHeader title="New announcement" icon={Megaphone} />
          <form onSubmit={publish} className="space-y-4 p-5">
            <Field label="Message" hint={`${message.length}/300`}>
              <Textarea
                required
                minLength={3}
                maxLength={300}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Special abhishekam at 6 PM. Expect a 30-minute delay in the general queue."
              />
            </Field>
            <Field label="Type">
              <Segmented
                value={type}
                onChange={setType}
                options={[
                  { value: 'info', label: 'Info' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </Field>
            <Button type="submit" icon={Send} loading={sending}>
              Publish
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="All announcements" />
          <ul className="divide-y divide-temple-100">
            {data?.map((a) => (
              <li key={a._id} className={cx('flex items-start justify-between gap-4 px-5 py-4', !a.isActive && 'opacity-60')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={TYPE_TONES[a.type]}>{a.type}</Badge>
                    <span className="text-xs text-temple-500">
                      {relativeTime(a.createdAt)}
                      {a.createdBy?.name ? ` · ${a.createdBy.name}` : ''}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-temple-800">{a.message}</p>
                </div>
                <Toggle checked={a.isActive} onChange={(v) => toggle(a, v)} />
              </li>
            ))}
            {data && !data.length && <li className="px-5 py-10 text-center text-sm text-temple-500">No announcements yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
