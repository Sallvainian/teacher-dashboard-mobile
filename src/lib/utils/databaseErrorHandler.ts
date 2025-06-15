/**
 * @ai-context DATABASE_ERROR_HANDLER - Standardized error handling for database operations
 * @ai-dependencies ai-enforcement types, database types
 * @ai-sideEffects Logs errors, tracks error patterns
 * @ai-exports Error handling utilities for consistent database error management
 */
import type { DatabaseResult, UnknownError } from '$lib/types/ai-enforcement';

// Error classification for better handling
export interface DatabaseErrorDetails {
  type: 'connection' | 'permission' | 'constraint' | 'validation' | 'unknown';
  message: string;
  originalError: unknown;
  recoverable: boolean;
  tableName?: string;
  operation?: string;
}

/**
 * @ai-flow INPUT: error, context -> CLASSIFY -> LOG -> OUTPUT: DatabaseErrorDetails
 * @ai-sideEffects Logs error details, tracks error patterns for monitoring
 */
export function classifyDatabaseError(
  error: UnknownError, 
  tableName?: string, 
  operation?: string
): DatabaseErrorDetails {
  const context = `${operation || 'operation'} on ${tableName || 'table'}`;
  
  // Handle Supabase-specific errors
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    // Connection/Network errors
    if (errorObj.code === 'NETWORK_ERROR' || errorObj.message?.toString().includes('network')) {
      return {
        type: 'connection',
        message: `Network error during ${context}`,
        originalError: error,
        recoverable: true,
        tableName,
        operation
      };
    }
    
    // Permission errors
    if (errorObj.code === '42501' || errorObj.message?.toString().includes('permission')) {
      return {
        type: 'permission',
        message: `Permission denied for ${context}`,
        originalError: error,
        recoverable: false,
        tableName,
        operation
      };
    }
    
    // Constraint violations
    if (errorObj.code?.toString().startsWith('23') || errorObj.message?.toString().includes('constraint')) {
      return {
        type: 'constraint',
        message: `Data constraint violation during ${context}`,
        originalError: error,
        recoverable: false,
        tableName,
        operation
      };
    }
    
    // Validation errors
    if (errorObj.code?.toString().startsWith('22') || errorObj.message?.toString().includes('invalid')) {
      return {
        type: 'validation',
        message: `Data validation failed for ${context}`,
        originalError: error,
        recoverable: true,
        tableName,
        operation
      };
    }
  }
  
  // Generic error fallback
  return {
    type: 'unknown',
    message: `Unknown error during ${context}: ${String(error)}`,
    originalError: error,
    recoverable: true,
    tableName,
    operation
  };
}

/**
 * @ai-flow INPUT: error_details -> LOG_STRUCTURED -> TRACK_PATTERNS -> OUTPUT: void
 * @ai-sideEffects Logs structured error information for debugging and monitoring
 */
export function logDatabaseError(errorDetails: DatabaseErrorDetails): void {
  const logLevel = errorDetails.recoverable ? 'warn' : 'error';
  const logPrefix = errorDetails.recoverable ? '⚠️' : '🚨';
  
  console[logLevel](`${logPrefix} Database ${errorDetails.type} error:`, {
    message: errorDetails.message,
    table: errorDetails.tableName,
    operation: errorDetails.operation,
    recoverable: errorDetails.recoverable,
    timestamp: new Date().toISOString()
  });
  
  // Log original error details for debugging
  if (errorDetails.originalError && typeof errorDetails.originalError === 'object') {
    const err = errorDetails.originalError as Record<string, unknown>;
    if (err.message) console[logLevel]('Original message:', err.message);
    if (err.details) console[logLevel]('Error details:', err.details);
    if (err.code) console[logLevel]('Error code:', err.code);
    if (err.hint) console[logLevel]('Error hint:', err.hint);
  }
}

/**
 * @ai-flow INPUT: error, context -> CLASSIFY -> LOG -> CREATE_RESULT -> OUTPUT: DatabaseResult<T>
 * @ai-sideEffects Logs error, returns standardized failure result
 */
export function handleDatabaseError<T>(
  error: UnknownError,
  tableName?: string,
  operation?: string
): DatabaseResult<T> {
  const errorDetails = classifyDatabaseError(error, tableName, operation);
  logDatabaseError(errorDetails);
  
  return {
    success: false,
    error: errorDetails.message,
    details: errorDetails.type,
    recoverable: errorDetails.recoverable,
    fallbackUsed: false
  };
}

/**
 * @ai-flow INPUT: operation_result -> MEASURE_PERFORMANCE -> CREATE_SUCCESS_RESULT -> OUTPUT: DatabaseResult<T>
 * @ai-sideEffects Tracks performance metrics, logs operation success
 */
export function createSuccessResult<T>(
  data: T,
  sideEffects: string[],
  executionTime: number,
  fromCache = false,
  fromFallback = false,
  rowsAffected?: number
): DatabaseResult<T> {
  // Log performance if operation was slow
  if (executionTime > 1000) {
    console.warn(`⏱️ Slow database operation: ${executionTime.toFixed(2)}ms`);
  } else if (executionTime > 100) {
    console.info(`⏱️ Database operation: ${executionTime.toFixed(2)}ms`);
  }
  
  return {
    success: true,
    data,
    sideEffects,
    metadata: {
      executionTime,
      fromCache,
      fromFallback,
      rowsAffected
    }
  };
}

/**
 * @ai-flow INPUT: database_operation -> EXECUTE_WITH_TIMING -> HANDLE_ERRORS -> OUTPUT: DatabaseResult<T>
 * @ai-sideEffects Executes operation with standardized error handling and performance tracking
 */
export async function executeDatabaseOperation<T>(
  operation: () => Promise<T>,
  tableName?: string,
  operationName?: string
): Promise<DatabaseResult<T>> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const executionTime = performance.now() - startTime;
    
    return createSuccessResult(
      result,
      [`Executed ${operationName || 'operation'} on ${tableName || 'table'}`],
      executionTime,
      false,
      false
    );
  } catch (error: UnknownError) {
    return handleDatabaseError<T>(error, tableName, operationName);
  }
}

// Recovery strategies for different error types
export const RECOVERY_STRATEGIES = {
  connection: 'Retry with exponential backoff, fallback to localStorage',
  permission: 'Check user authentication, redirect to login if needed',
  constraint: 'Validate data before retry, show user-friendly error',
  validation: 'Clean and validate input data, retry operation',
  unknown: 'Log for investigation, fallback to localStorage if available'
} as const;

/**
 * Get suggested recovery action for error type
 */
export function getRecoveryStrategy(errorType: DatabaseErrorDetails['type']): string {
  return RECOVERY_STRATEGIES[errorType];
}