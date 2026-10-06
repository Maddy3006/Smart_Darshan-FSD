import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathFor } from '../lib/constants.js';
import { PageLoader } from './ui.jsx';

/** Renders children only for logged-in users (optionally with one of `roles`). */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
