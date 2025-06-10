// src/lib/types/ai-optimized.ts
// AI-optimized types that prevent common errors

/**
 * @ai-context Branded types prevent ID mixups and invalid states
 * @ai-benefit Compile-time prevention of wrong parameter errors
 */

// Branded types prevent mixing up different ID types
export type StudentId = string & { readonly __brand: 'StudentId' };
export type ClassId = string & { readonly __brand: 'ClassId' };
export type AssignmentId = string & { readonly __brand: 'AssignmentId' };
export type UserId = string & { readonly __brand: 'UserId' };

// Helper functions to create branded types safely
export const createStudentId = (id: string): StudentId => id as StudentId;
export const createClassId = (id: string): ClassId => id as ClassId;
export const createAssignmentId = (id: string): AssignmentId => id as AssignmentId;
export const createUserId = (id: string): UserId => id as UserId;

/**
 * @ai-context Self-documenting result types that guide correct usage
 * @ai-benefit Prevents forgetting to handle errors and makes success/failure explicit
 */
export type ActionResult<T = void> = {
  success: true;
  data: T;
  sideEffects: string[]; // What was modified - helps AI understand consequences
} | {
  success: false;
  error: string;
  details?: string;
  recoverable: boolean; // Can the user retry this action?
};

/**
 * @ai-context Database operation result with explicit typing
 * @ai-benefit Prevents assumptions about what database operations return
 */
export type DatabaseResult<T> = {
  data: T | null;
  error: string | null;
  affected: number; // How many rows were affected
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT'; // What was done
};

/**
 * @ai-context Store update contracts that show data flow
 * @ai-benefit Makes it clear what stores get modified by any operation
 */
export type StoreUpdate<T> = {
  storeName: string;
  operation: 'SET' | 'UPDATE' | 'APPEND' | 'REMOVE';
  oldValue?: T;
  newValue: T;
  timestamp: number;
};

/**
 * @ai-context Function contracts that prevent misuse
 * @ai-benefit Self-documenting parameters with validation
 */
export type ValidatedInput<T> = {
  value: T;
  isValid: boolean;
  errors: string[];
  sanitized: T; // Safe version to use
};

// Type helpers that guide AI to correct usage
export type RequiresAuth<T> = T & { __requiresAuth: true };
export type RequiresRole<T, R extends 'teacher' | 'student'> = T & { __requiresRole: R };
export type ModifiesStore<T, S extends string> = T & { __modifiesStore: S };

/**
 * @ai-context Explicit dependency tracking
 * @ai-benefit Shows what each function depends on and modifies
 */
export interface FunctionContext {
  dependencies: string[]; // What stores/services this function reads from
  sideEffects: string[];  // What stores/tables this function modifies
  requires: ('auth' | 'network' | 'storage')[]; // What capabilities are needed
  canFail: boolean;       // Whether this function can throw/return errors
}