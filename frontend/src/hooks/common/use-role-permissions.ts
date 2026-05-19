/**
 * Hook to get role-based permissions and features
 */

import { useCurrentUser } from "@/hooks/api";
import { ROLES } from "@/lib/constants";

export interface RolePermissions {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  canCreateCourses: boolean;
  canDeleteCourses: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageTeachers: boolean;
  canManageSubjects: boolean;
  canManageCourseContent: boolean;
}

export function useRolePermissions(): RolePermissions {
  const { data: currentUser } = useCurrentUser();
  const userRole = currentUser?.role || ROLES.STUDENT;

  const isAdmin = userRole.toLowerCase() === ROLES.ADMIN;
  const isTeacher = userRole.toLowerCase() === ROLES.TEACHER;
  const isStudent = userRole.toLowerCase() === ROLES.STUDENT;

  return {
    isAdmin,
    isTeacher,
    isStudent,
    canCreateCourses: isAdmin || isTeacher,
    canDeleteCourses: isAdmin || isTeacher,
    canManageUsers: isAdmin,
    canViewAnalytics: isAdmin || isTeacher,
    canAccessSettings: isAdmin || isTeacher,
    canManageTeachers: isAdmin || isTeacher,
    canManageSubjects: isAdmin || isTeacher,
    canManageCourseContent: isAdmin || isTeacher,
  };
}
