import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, Card, ErrorBanner, Field, Input } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../lib/api.js';
import { homePathFor } from '../../lib/constants.js';

// Accounts created by the seed script (server/src/scripts/seedData.js). Shown only in development.
const DEMO_ACCOUNTS = [
  { label: 'Devotee', email: 'devotee@smartdarshan.in', password: 'Devotee@123' },
  { label: 'Gate staff', email: 'staff.venkateswara@smartdarshan.in', password: 'Staff@123' },
  { label: 'Temple admin', email: 'admin.venkateswara@smartdarshan.in', password: 'Admin@123' },
  { label: 'Superadmin', email: 'superadmin@smartdarshan.in', password: 'Super@123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={location.state?.from || homePathFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedIn = await login(form.email, form.password);
      navigate(location.state?.from || homePathFor(loggedIn), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:grid-cols-[1fr_0.9fr]">
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl">Welcome back</h1>
        <p className="mt-1 text-temple-600">Log in to book darshan and track your tokens.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <ErrorBanner message={error} />
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full" size="lg" icon={LogIn} loading={submitting}>
            Log in
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-temple-600">
          New here?{' '}
          <Link to="/register" state={location.state} className="font-semibold text-saffron-800 hover:underline">
            Create an account
          </Link>
        </p>
      </Card>

      {import.meta.env.DEV && (
        <Card className="self-start bg-temple-900 p-6 text-temple-200">
          <p className="font-semibold text-white">Demo accounts</p>
          <p className="mt-1 text-sm">Created by the seed script. Click one to fill the form.</p>
          <ul className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                  className="w-full rounded-xl bg-temple-800 px-4 py-3 text-left transition hover:bg-temple-700"
                >
                  <span className="block text-sm font-semibold text-white">{account.label}</span>
                  <span className="block truncate font-mono text-xs text-temple-300">{account.email}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-temple-400">This panel only appears in development builds.</p>
        </Card>
      )}
    </div>
  );
}
