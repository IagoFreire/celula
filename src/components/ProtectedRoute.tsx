import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children?: ReactNode;
  requireAdmin?: boolean;
  requireAdminOrLeader?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin, requireAdminOrLeader }: ProtectedRouteProps) {
  const { user, isAdmin, isAdminOrLeader } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/cronograma" replace />;
  }

  if (requireAdminOrLeader && !isAdminOrLeader) {
    return <Navigate to="/cronograma" replace />;
  }

  return <>{children}</>;
}
