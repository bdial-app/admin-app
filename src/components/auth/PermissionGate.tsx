import type { ReactNode } from 'react';
import { useHasPermission, useMinRole } from '../../hooks/usePermissions';
import type { AdminRole, Permission } from '../../types/roles';

interface PermissionGateProps {
  /** Required permission key */
  permission: Permission;
  /** Content to render when user has permission */
  children: ReactNode;
  /** Optional fallback when user lacks permission */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only if the current user has the specified permission.
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const hasPermission = useHasPermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateProps {
  /** Minimum role required */
  minRole: AdminRole;
  /** Content to render when user meets role requirement */
  children: ReactNode;
  /** Optional fallback when user lacks role */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only if the current user's role meets the minimum.
 */
export function RoleGate({ minRole, children, fallback = null }: RoleGateProps) {
  const hasRole = useMinRole(minRole);
  return hasRole ? <>{children}</> : <>{fallback}</>;
}
