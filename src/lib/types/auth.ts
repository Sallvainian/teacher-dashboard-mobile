/**
 * @ai-context AUTH_TYPES - Authentication and user management types
 * @ai-dependencies supabase, database.ts, ai-enforcement.ts
 * @ai-sideEffects None - pure type definitions
 * @ai-exports AppUser, AuthState, StudentSignupData, TeacherSignupData
 */
import type { User, AuthSession } from '@supabase/supabase-js';
import type { UserRole } from './database';
import type { UserId } from './ai-enforcement';

export interface AppUser extends User {
  role?: UserRole;
  full_name?: string;
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  profile: {
    id: UserId;
    email: string;
    full_name: string;
    avatar_url?: string | null;
    role: UserRole | null;
  } | null;
  session: AuthSession | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isTeacher?: boolean;
  isStudent?: boolean;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

export interface StudentSignupData {
  email: string;
  password: string;
  fullName: string;
  joinCode?: string; // Optional class join code
}

export interface TeacherSignupData {
  email: string;
  password: string;
  fullName: string;
  schoolName?: string;
}
