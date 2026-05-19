import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { ROLE_HIERARCHY, PERMISSIONS, type AdminRole, type Permission } from '../types/roles';

/**
 * Get the current user's role from Redux auth state.
 */
export function useCurrentRole(): AdminRole {
  const user = useSelector((state: RootState) => state.auth.user);
  return (user?.role as AdminRole) || 'associate';
}

/**
 * Check if the current user's role meets or exceeds the specified minimum role.
 */
export function useMinRole(minRole: AdminRole): boolean {
  const currentRole = useCurrentRole();
  return (ROLE_HIERARCHY[currentRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 99);
}

/**
 * Check if the current user has a specific permission.
 * Permissions map to a minimum role — if user's role >= required role, they have it.
 */
export function useHasPermission(permission: Permission): boolean {
  const currentRole = useCurrentRole();
  const requiredRole = PERMISSIONS[permission];
  if (!requiredRole) return false;
  return (ROLE_HIERARCHY[currentRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

/**
 * Get a function that checks permissions (useful for conditional logic without hook rules).
 */
export function usePermissionChecker() {
  const currentRole = useCurrentRole();
  const roleWeight = ROLE_HIERARCHY[currentRole] ?? 0;

  return {
    role: currentRole,
    hasPermission: (permission: Permission) => {
      const requiredRole = PERMISSIONS[permission];
      if (!requiredRole) return false;
      return roleWeight >= (ROLE_HIERARCHY[requiredRole] ?? 99);
    },
    minRole: (minRole: AdminRole) => roleWeight >= (ROLE_HIERARCHY[minRole] ?? 99),
  };
}
