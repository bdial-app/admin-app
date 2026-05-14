import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useMinRole } from '../../hooks/usePermissions';
import type { AdminRole } from '../../types/roles';

interface ProtectedRouteProps {
  /** Minimum role required to view this route */
  minRole: AdminRole;
  /** Page content */
  children: ReactNode;
}

/**
 * Wraps a route's element. If the user's role is insufficient,
 * redirects to /unauthorized instead of rendering the page.
 */
export function ProtectedRoute({ minRole, children }: ProtectedRouteProps) {
  const hasAccess = useMinRole(minRole);

  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
