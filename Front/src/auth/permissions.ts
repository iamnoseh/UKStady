import type { UserRole } from '../types/auth';

export type Permission =
  | 'dashboard.view'
  | 'students.manage'
  | 'teachers.manage'
  | 'admins.manage'
  | 'groups.view'
  | 'journal.view'
  | 'subjects.view'
  | 'tests.view';

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  SuperAdmin: new Set<Permission>([
    'dashboard.view',
    'students.manage',
    'teachers.manage',
    'admins.manage',
    'groups.view',
    'subjects.view',
  ]),
  Admin: new Set<Permission>([
    'dashboard.view',
    'students.manage',
    'teachers.manage',
    'groups.view',
    'subjects.view',
  ]),
  Manager: new Set<Permission>([
    'dashboard.view',
    'students.manage',
    'teachers.manage',
    'groups.view',
    'subjects.view',
  ]),
  Teacher: new Set<Permission>([
    'dashboard.view',
    'groups.view',
    'subjects.view',
  ]),
  Student: new Set<Permission>([
    'tests.view',
    'journal.view',
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].has(permission);
}
