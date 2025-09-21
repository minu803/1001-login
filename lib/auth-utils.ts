import { UserRole } from '@prisma/client';
import { Session } from 'next-auth';

// Role hierarchy - higher roles have access to lower role features
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.INSTITUTION]: 80,
  [UserRole.TEACHER]: 60,
  [UserRole.VOLUNTEER]: 40,
  [UserRole.LEARNER]: 20,
};

// Check if a user has a specific role
export function hasRole(session: Session | null, role: UserRole): boolean {
  if (!session?.user) return false;
  return session.user.role === role;
}

// Check if a user has any of the specified roles
export function hasAnyRole(session: Session | null, roles: UserRole[]): boolean {
  if (!session?.user) return false;
  const userRole = session.user.role || UserRole.LEARNER;
  return roles.includes(userRole);
}

// Check if a user has at least the specified role level (based on hierarchy)
export function hasMinimumRole(session: Session | null, minimumRole: UserRole): boolean {
  if (!session?.user) return false;
  const userRole = session.user.role || UserRole.LEARNER;
  return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
}

// Get the dashboard URL for a specific role
export function getRoleDashboardUrl(role: UserRole): string {
  const dashboardUrls: Record<UserRole, string> = {
    [UserRole.ADMIN]: '/admin',
    [UserRole.TEACHER]: '/dashboard/teacher',
    [UserRole.LEARNER]: '/dashboard/learner',
    [UserRole.INSTITUTION]: '/dashboard/institution',
    [UserRole.VOLUNTEER]: '/dashboard/volunteer',
  };
  
  return dashboardUrls[role] || '/dashboard';
}

// Get accessible routes for a specific role
export function getAccessibleRoutes(role: UserRole): string[] {
  const publicRoutes = ['/', '/about', '/contact', '/library', '/shop'];
  
  const roleRoutes: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: [
      ...publicRoutes,
      '/admin',
      '/admin/**',
      '/dashboard',
      '/dashboard/**',
      '/settings',
      '/api/**',
    ],
    [UserRole.TEACHER]: [
      ...publicRoutes,
      '/dashboard',
      '/dashboard/teacher',
      '/dashboard/teacher/**',
      '/classes',
      '/classes/**',
      '/students',
      '/students/**',
      '/settings',
    ],
    [UserRole.LEARNER]: [
      ...publicRoutes,
      '/dashboard',
      '/dashboard/learner',
      '/dashboard/learner/**',
      '/my-learning',
      '/my-learning/**',
      '/settings',
    ],
    [UserRole.INSTITUTION]: [
      ...publicRoutes,
      '/dashboard',
      '/dashboard/institution',
      '/dashboard/institution/**',
      '/programs',
      '/programs/**',
      '/volunteers',
      '/volunteers/**',
      '/settings',
    ],
    [UserRole.VOLUNTEER]: [
      ...publicRoutes,
      '/dashboard',
      '/dashboard/volunteer',
      '/dashboard/volunteer/**',
      '/volunteer',
      '/volunteer/**',
      '/projects',
      '/projects/**',
      '/settings',
    ],
  };
  
  return roleRoutes[role] || publicRoutes;
}

// Check if a user can access a specific route
export function canAccessRoute(session: Session | null, route: string): boolean {
  if (!session?.user) {
    // Allow access to public routes even when not logged in
    const publicRoutes = ['/', '/about', '/contact', '/library', '/shop', '/login', '/signup'];
    return publicRoutes.some(publicRoute => 
      route === publicRoute || route.startsWith(`${publicRoute}/`)
    );
  }
  
  const userRole = session.user.role || UserRole.LEARNER;
  const accessibleRoutes = getAccessibleRoutes(userRole);
  
  return accessibleRoutes.some(accessibleRoute => {
    if (accessibleRoute.endsWith('/**')) {
      const baseRoute = accessibleRoute.slice(0, -3);
      return route.startsWith(baseRoute);
    }
    return route === accessibleRoute;
  });
}

// Permission definitions for features
export const permissions = {
  // Content management
  canCreateStory: [UserRole.ADMIN, UserRole.TEACHER],
  canEditStory: [UserRole.ADMIN],
  canDeleteStory: [UserRole.ADMIN],
  canPublishStory: [UserRole.ADMIN],
  
  // User management
  canManageUsers: [UserRole.ADMIN],
  canViewAllUsers: [UserRole.ADMIN, UserRole.INSTITUTION],
  canEditUserRoles: [UserRole.ADMIN],
  
  // Class management
  canCreateClass: [UserRole.TEACHER, UserRole.INSTITUTION],
  canManageClasses: [UserRole.TEACHER, UserRole.INSTITUTION, UserRole.ADMIN],
  canEnrollStudents: [UserRole.TEACHER, UserRole.INSTITUTION],
  
  // Volunteer management
  canManageVolunteers: [UserRole.INSTITUTION, UserRole.ADMIN],
  canAssignProjects: [UserRole.ADMIN],
  canReviewVolunteerWork: [UserRole.ADMIN, UserRole.TEACHER],
  
  // E-commerce
  canManageProducts: [UserRole.ADMIN],
  canViewSalesData: [UserRole.ADMIN],
  canProcessRefunds: [UserRole.ADMIN],
  
  // Analytics
  canViewAnalytics: [UserRole.ADMIN, UserRole.INSTITUTION],
  canExportData: [UserRole.ADMIN],
  
  // Settings
  canManageSystemSettings: [UserRole.ADMIN],
  canManageInstitutionSettings: [UserRole.INSTITUTION],
};

// Check if a user has a specific permission
export function hasPermission(
  session: Session | null, 
  permission: keyof typeof permissions
): boolean {
  if (!session?.user) return false;
  const userRole = session.user.role || UserRole.LEARNER;
  const allowedRoles = permissions[permission] as UserRole[];
  return allowedRoles.includes(userRole);
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): string[] {
  return Object.entries(permissions)
    .filter(([, allowedRoles]) => (allowedRoles as UserRole[]).includes(role))
    .map(([permission]) => permission);
}

// Format role name for display
export function formatRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrator',
    [UserRole.TEACHER]: 'Teacher',
    [UserRole.LEARNER]: 'Learner',
    [UserRole.INSTITUTION]: 'Institution',
    [UserRole.VOLUNTEER]: 'Volunteer',
  };
  
  return roleNames[role] || 'User';
}

// Get role badge color classes
export function getRoleBadgeColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'bg-red-100 text-red-800 border-red-200',
    [UserRole.TEACHER]: 'bg-green-100 text-green-800 border-green-200',
    [UserRole.LEARNER]: 'bg-blue-100 text-blue-800 border-blue-200',
    [UserRole.INSTITUTION]: 'bg-purple-100 text-purple-800 border-purple-200',
    [UserRole.VOLUNTEER]: 'bg-pink-100 text-pink-800 border-pink-200',
  };
  
  return roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
}