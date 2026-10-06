import { KeyRound, Save } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { ROLE_LABELS } from '../../lib/constants.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving('profile');
    try {
      const { data } = await api.patch('/auth/me', profile);
      setUser((u) => ({ ...u, ...data.user }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSaving('password');
    try {
      await api.post('/auth/me/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Your profile" subtitle={user.email} badge={<Badge tone="saffron">{ROLE_LABELS[user.role]}</Badge>} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <form onSubmit={saveProfile} className="space-y-4 p-5">
            <Field label="Name" htmlFor="name">
              <Input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </Field>
            <Field label="Mobile number" htmlFor="phone" hint="Used for SMS confirmations and reminders">
              <Input id="phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            </Field>
            <Button type="submit" icon={Save} loading={saving === 'profile'}>
              Save
            </Button>
          </form>
        </Card>
        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={changePassword} className="space-y-4 p-5">
            <Field label="Current password" htmlFor="current">
              <Input
                id="current"
                type="password"
                required
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </Field>
            <Field label="New password" htmlFor="new" hint="At least 6 characters">
              <Input
                id="new"
                type="password"
                required
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </Field>
            <Button type="submit" variant="secondary" icon={KeyRound} loading={saving === 'password'}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
