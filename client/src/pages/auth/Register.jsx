import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, ErrorBanner, Field, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../lib/api.js';
import { homePathFor } from '../../lib/constants.js';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError('');
    setSubmitting(true);
    try {
      const { confirm: _confirm, ...payload } = form;
      await register(payload);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
    return undefined;
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl">Create your account</h1>
        <p className="mt-1 text-temple-600">Book darshan slots and get live queue updates.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBanner message={error} />
          <Field label="Full name" htmlFor="name">
            <Input id="name" required autoComplete="name" value={form.name} onChange={update('name')} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={update('email')} />
          </Field>
          <Field label="Mobile number" htmlFor="phone" hint="Optional. Used for SMS confirmations and slot reminders.">
            <Input id="phone" type="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={update('phone')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="password" hint="At least 6 characters">
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
              />
            </Field>
            <Field label="Confirm password" htmlFor="confirm">
              <Input id="confirm" type="password" required autoComplete="new-password" value={form.confirm} onChange={update('confirm')} />
            </Field>
          </div>
          <Button type="submit" className="w-full" size="lg" icon={UserPlus} loading={submitting}>
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-temple-600">
          Already registered?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-saffron-800 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
