import {
  Bell,
  Building2,
  ChartColumn,
  CalendarClock,
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  ScanLine,
  Settings,
  Store,
  Ticket,
  UserPlus,
  X,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useRoom, useSocket, useSocketEvent } from '../../context/SocketContext.jsx';
import { api, errorMessage, storage, TEMPLE_SCOPE_KEY } from '../../lib/api.js';
import { ROLE_LABELS } from '../../lib/constants.js';
import { LiveDot } from '../StatusBadge.jsx';
import { Button, Card, cx, EmptyState, PageLoader, Select } from '../ui.jsx';
import { Logo } from './PublicLayout.jsx';

const NAV = [
  { section: 'Platform', roles: ['superadmin'], items: [{ to: '/super', label: 'All temples', icon: Globe, end: true }] },
  {
    section: 'Temple admin',
    roles: ['admin', 'superadmin'],
    needsTemple: true,
    items: [
      { to: '/admin', label: 'Crowd dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics & forecast', icon: ChartColumn },
      { to: '/admin/slots', label: 'Darshan slots', icon: CalendarClock },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/admin/staff', label: 'Staff accounts', icon: UserPlus },
      { to: '/admin/settings', label: 'Temple settings', icon: Settings },
    ],
  },
  {
    section: 'Gate operations',
    roles: ['staff', 'admin', 'superadmin'],
    needsTemple: true,
    items: [
      { to: '/staff/scan', label: 'QR gate scanner', icon: ScanLine },
      { to: '/staff/walkin', label: 'Walk-in counter', icon: Ticket },
      { to: '/kiosk', label: 'Self-service kiosk', icon: Store, external: true },
    ],
  },
];

export default function ConsoleLayout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuper = user.role === 'superadmin';

  const [scope, setScope] = useState(() => storage.get(TEMPLE_SCOPE_KEY) || '');
  const [temple, setTemple] = useState(null);
  const [templeError, setTempleError] = useState('');
  const [loadingTemple, setLoadingTemple] = useState(!isSuper || Boolean(scope));
  const [templeOptions, setTempleOptions] = useState([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const hasTemple = !isSuper || Boolean(scope);
  const canAdmin = ['admin', 'superadmin'].includes(user.role);

  const loadTemple = useCallback(async () => {
    if (!hasTemple) return;
    setLoadingTemple(true);
    try {
      const { data } = await api.get('/staff/context');
      setTemple(data.temple);
      setTempleError('');
    } catch (err) {
      setTempleError(errorMessage(err));
    } finally {
      setLoadingTemple(false);
    }
  }, [hasTemple]);

  useEffect(() => {
    loadTemple();
  }, [loadTemple, scope]);

  useEffect(() => {
    if (!isSuper) return;
    api
      .get('/superadmin/temples')
      .then(({ data }) => setTempleOptions(data.temples))
      .catch(() => {});
  }, [isSuper, location.pathname]);

  useEffect(() => {
    if (!canAdmin || !temple) return;
    api
      .get('/admin/alerts')
      .then(({ data }) => setUnreadAlerts(data.unacknowledged))
      .catch(() => {});
  }, [canAdmin, temple]);

  useRoom('admin', temple?._id);
  useSocketEvent('alert:new', (alert) => {
    setUnreadAlerts((n) => n + 1);
    toast(alert.message, { icon: alert.level === 'critical' ? '🚨' : '⚠️', duration: 8000 });
  });

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const changeScope = (id) => {
    if (id) storage.set(TEMPLE_SCOPE_KEY, id);
    else storage.remove(TEMPLE_SCOPE_KEY);
    setTemple(null);
    setScope(id);
    navigate(id ? '/admin' : '/super');
  };

  const sections = NAV.filter((s) => s.roles.includes(user.role));
  const onSuperPage = location.pathname.startsWith('/super');

  const sidebar = (
    <aside className="flex h-full flex-col bg-temple-900 text-temple-200">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo light />
        <button type="button" className="rounded-lg p-1 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>

      {isSuper && (
        <div className="px-4 pb-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-temple-400">Managing temple</label>
          <Select value={scope} onChange={(e) => changeScope(e.target.value)} className="border-temple-700 bg-temple-800 text-white">
            <option value="">Select a temple...</option>
            {templeOptions.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {!isSuper && temple && (
        <div className="mx-4 mb-3 rounded-xl bg-temple-800 px-3 py-2.5">
          <p className="text-xs text-temple-400">Temple</p>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <Building2 className="size-4 text-saffron-300" /> {temple.name}
          </p>
        </div>
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.section}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-temple-500">{section.section}</p>
            {section.items.map((item) => {
              const disabled = section.needsTemple && !hasTemple;
              if (disabled) {
                return (
                  <span key={item.to} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-temple-600">
                    <item.icon className="size-4" /> {item.label}
                  </span>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition',
                      isActive ? 'bg-saffron-800 text-white' : 'hover:bg-temple-800 hover:text-white',
                    )
                  }
                >
                  <item.icon className="size-4" /> {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}
        {temple && (
          <div>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-temple-500">Public screens</p>
            <a
              href={`/display/${temple.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-temple-800 hover:text-white"
            >
              <Monitor className="size-4" /> Entry display board
            </a>
            <Link
              to={`/temples/${temple.slug}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-temple-800 hover:text-white"
            >
              <Globe className="size-4" /> Public temple page
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-temple-800 p-4">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-temple-400">
          {ROLE_LABELS[user.role]} · {user.email}
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="mt-3 flex items-center gap-2 text-sm text-temple-300 hover:text-white"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </aside>
  );

  let content;
  if (!hasTemple && !onSuperPage) {
    content = (
      <Card className="mx-auto mt-10 max-w-lg">
        <EmptyState
          icon={Building2}
          title="Choose a temple to manage"
          message="Use the temple selector in the sidebar, or open the temple list."
          action={<Button onClick={() => navigate('/super')}>View all temples</Button>}
        />
      </Card>
    );
  } else if (hasTemple && loadingTemple && !temple && !onSuperPage) {
    content = <PageLoader />;
  } else if (templeError && !onSuperPage) {
    content = (
      <Card className="mx-auto mt-10 max-w-lg">
        <EmptyState
          icon={Building2}
          title="Could not load temple"
          message={templeError}
          action={<Button onClick={loadTemple}>Retry</Button>}
        />
      </Card>
    );
  } else {
    content = (
      <Suspense fallback={<PageLoader />}>
        <Outlet context={{ temple, reloadTemple: loadTemple, clearAlerts: () => setUnreadAlerts(0) }} key={scope} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <div className="no-print sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 max-w-[85vw]">{sidebar}</div>
          <button type="button" className="flex-1 bg-temple-950/50" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
        </div>
      )}
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-temple-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 hover:bg-temple-100 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <p className="truncate text-sm font-semibold text-temple-800">{onSuperPage ? 'Platform administration' : temple?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <LiveDot connected={connected} />
            {canAdmin && temple && (
              <button
                type="button"
                onClick={() => navigate('/admin#alerts')}
                className="relative rounded-lg p-2 text-temple-600 hover:bg-temple-100"
                title="Crowd alerts"
              >
                <Bell className="size-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                    {unreadAlerts}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{content}</main>
      </div>
    </div>
  );
}
