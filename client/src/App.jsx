import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/layout/PublicLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { PageLoader } from './components/ui.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import NotFound from './pages/NotFound.jsx';
import Home from './pages/public/Home.jsx';
import TokenStatus from './pages/public/TokenStatus.jsx';
import TrackToken from './pages/public/TrackToken.jsx';

// Heavier screens (charts, camera scanner, staff/admin console) load on demand.
const TempleDetail = lazy(() => import('./pages/public/TempleDetail.jsx'));
const DisplayBoard = lazy(() => import('./pages/public/DisplayBoard.jsx'));
const BookDarshan = lazy(() => import('./pages/devotee/BookDarshan.jsx'));
const MyTokens = lazy(() => import('./pages/devotee/MyTokens.jsx'));
const Profile = lazy(() => import('./pages/devotee/Profile.jsx'));
const ConsoleLayout = lazy(() => import('./components/layout/ConsoleLayout.jsx'));
const Scanner = lazy(() => import('./pages/staff/Scanner.jsx'));
const WalkinCounter = lazy(() => import('./pages/staff/WalkinCounter.jsx'));
const Kiosk = lazy(() => import('./pages/staff/Kiosk.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Analytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const Slots = lazy(() => import('./pages/admin/Slots.jsx'));
const Announcements = lazy(() => import('./pages/admin/Announcements.jsx'));
const StaffAccounts = lazy(() => import('./pages/admin/StaffAccounts.jsx'));
const Settings = lazy(() => import('./pages/admin/Settings.jsx'));
const SuperTemples = lazy(() => import('./pages/super/SuperTemples.jsx'));

const CONSOLE_ROLES = ['staff', 'admin', 'superadmin'];
const ADMIN_ROLES = ['admin', 'superadmin'];

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'text-sm', style: { maxWidth: 420 } }} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="track" element={<TrackToken />} />
            <Route path="temples/:slug" element={<TempleDetail />} />
            <Route
              path="temples/:slug/book"
              element={
                <ProtectedRoute roles={['devotee']}>
                  <BookDarshan />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-tokens"
              element={
                <ProtectedRoute roles={['devotee']}>
                  <MyTokens />
                </ProtectedRoute>
              }
            />
            <Route path="t/:code" element={<TokenStatus />} />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="display/:slug" element={<DisplayBoard />} />
          <Route
            path="kiosk"
            element={
              <ProtectedRoute roles={CONSOLE_ROLES}>
                <Kiosk />
              </ProtectedRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute roles={CONSOLE_ROLES}>
                <ConsoleLayout />
              </ProtectedRoute>
            }
          >
            <Route path="staff/scan" element={<Scanner />} />
            <Route path="staff/walkin" element={<WalkinCounter />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/analytics"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/slots"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <Slots />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/announcements"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <Announcements />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/staff"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <StaffAccounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/settings"
              element={
                <ProtectedRoute roles={ADMIN_ROLES}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="super"
              element={
                <ProtectedRoute roles={['superadmin']}>
                  <SuperTemples />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
