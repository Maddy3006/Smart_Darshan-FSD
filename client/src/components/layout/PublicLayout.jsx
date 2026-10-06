import { Landmark, LayoutDashboard, LogOut, Menu, Ticket, User, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homePathFor, isConsoleRole } from '../../lib/constants.js';
import { cx, LinkButton, PageLoader } from '../ui.jsx';

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-saffron-800 text-saffron-100 shadow-sm">
        <Landmark className="size-5" />
      </span>
      <span className={cx('font-display text-xl', light ? 'text-white' : 'text-temple-900')}>Smart Darshan</span>
    </Link>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', label: 'Temples', end: true },
    { to: '/track', label: 'Track token' },
  ];
  if (user?.role === 'devotee') links.push({ to: '/my-tokens', label: 'My tokens' });

  const navClass = ({ isActive }) =>
    cx(
      'rounded-lg px-3 py-2 text-sm font-medium transition',
      isActive ? 'bg-saffron-50 text-saffron-800' : 'text-temple-700 hover:bg-temple-100',
    );

  const signOut = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-temple-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {isConsoleRole(user.role) && (
                <LinkButton to={homePathFor(user)} size="sm" icon={LayoutDashboard}>
                  Open console
                </LinkButton>
              )}
              <LinkButton to="/profile" variant="ghost" size="sm" icon={User}>
                {user.name.split(' ')[0]}
              </LinkButton>
              <button type="button" onClick={signOut} className="rounded-lg p-2 text-temple-600 hover:bg-temple-100" title="Log out">
                <LogOut className="size-4" />
              </button>
            </>
          ) : (
            <>
              <LinkButton to="/login" variant="ghost" size="sm">
                Log in
              </LinkButton>
              <LinkButton to="/register" size="sm">
                Register
              </LinkButton>
            </>
          )}
        </div>
        <button type="button" className="rounded-lg p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-temple-100 bg-white px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={(s) => cx(navClass(s), 'block')}>
              {l.label}
            </NavLink>
          ))}
          <div className="border-t border-temple-100 pt-2">
            {user ? (
              <>
                {isConsoleRole(user.role) && (
                  <NavLink to={homePathFor(user)} className={(s) => cx(navClass(s), 'block')}>
                    Open console
                  </NavLink>
                )}
                <NavLink to="/profile" className={(s) => cx(navClass(s), 'block')}>
                  Profile
                </NavLink>
                <button
                  type="button"
                  onClick={signOut}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-temple-700 hover:bg-temple-100"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={(s) => cx(navClass(s), 'block')}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={(s) => cx(navClass(s), 'block')}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="no-print mt-16 border-t border-temple-200 bg-temple-900 text-temple-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 text-sm">Real-time queue and crowd management for temples, using virtual tokens and predictive analytics.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">For devotees</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link to="/" className="hover:text-white">
                Find a temple
              </Link>
            </li>
            <li>
              <Link to="/track" className="hover:text-white">
                Track a token
              </Link>
            </li>
            <li>
              <Link to="/my-tokens" className="hover:text-white">
                My tokens
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">No smartphone?</p>
          <p className="mt-2">
            Get a walk-in token at the temple kiosk, or SMS <span className="font-mono text-saffron-200">STATUS &lt;token code&gt;</span> to
            check your queue position.
          </p>
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 border-t border-temple-800 py-4 text-xs text-temple-400">
        <Ticket className="size-3.5" /> Smart Darshan · MERN stack project
      </p>
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
