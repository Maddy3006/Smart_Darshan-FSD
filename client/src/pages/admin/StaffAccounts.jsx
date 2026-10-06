import { KeyRound, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ErrorBanner, Field, Input, Modal, PageHeader, Select, Toggle } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api, errorMessage } from '../../lib/api.js';
import { ROLE_LABELS } from '../../lib/constants.js';
import { relativeTime } from '../../lib/format.js';

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'staff' };

export default function StaffAccounts() {
  const { user } = useAuth();
  const { data, reload, error } = useFetch(async () => (await api.get('/admin/staff')).data.staff, []);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetFor, setResetFor] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/admin/staff', form);
      toast.success(`Account created for ${form.name}`);
      setOpen(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const update = async (member, changes, message) => {
    try {
      await api.patch(`/admin/staff/${member._id}`, changes);
      toast.success(message);
      reload();
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff accounts"
        subtitle="Gate staff can scan tokens and issue walk-ins. Admins can also change settings."
        actions={
          <Button icon={UserPlus} onClick={() => setOpen(true)}>
            Add staff
          </Button>
        }
      />
      <ErrorBanner message={error} onRetry={reload} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-temple-50 text-left text-xs text-temple-600">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Name</th>
              <th className="px-3 py-2.5 font-semibold">Email / phone</th>
              <th className="px-3 py-2.5 font-semibold">Role</th>
              <th className="px-3 py-2.5 font-semibold">Last login</th>
              <th className="px-3 py-2.5 font-semibold">Active</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-temple-100">
            {data?.map((member) => (
              <tr key={member._id}>
                <td className="px-5 py-3 font-medium">{member.name}</td>
                <td className="px-3 py-3 text-temple-600">
                  <p>{member.email}</p>
                  {member.phone && <p className="text-xs">{member.phone}</p>}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={member.role === 'admin' ? 'saffron' : 'gray'}>{ROLE_LABELS[member.role]}</Badge>
                </td>
                <td className="px-3 py-3 text-temple-600">{member.lastLoginAt ? relativeTime(member.lastLoginAt) : 'Never'}</td>
                <td className="px-3 py-3">
                  <Toggle
                    checked={member.isActive}
                    disabled={member._id === user._id}
                    onChange={(isActive) => update(member, { isActive }, isActive ? 'Account activated' : 'Account deactivated')}
                  />
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetFor(member)}>
                    Reset password
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
        title="Add staff account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" loading={saving}>
              Create account
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={create} className="space-y-4">
          <ErrorBanner message={formError} />
          <Field label="Full name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone" hint="Optional">
              <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Temporary password" hint="At least 6 characters">
              <Input required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Role">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Gate staff</option>
                <option value="admin">Temple admin</option>
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(resetFor)}
        onClose={() => setResetFor(null)}
        title={`Reset password for ${resetFor?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={newPassword.length < 6}
              onClick={async () => {
                if (await update(resetFor, { password: newPassword }, 'Password reset')) {
                  setResetFor(null);
                  setNewPassword('');
                }
              }}
            >
              Set password
            </Button>
          </>
        }
      >
        <Field label="New password" hint="Share it with the staff member securely">
          <Input minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
