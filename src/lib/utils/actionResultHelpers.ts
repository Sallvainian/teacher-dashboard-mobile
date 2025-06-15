/**
 * @ai-context ACTION_RESULT_HELPERS - Utility functions for ActionResult pattern
 * @ai-dependencies ai-enforcement types
 * @ai-sideEffects None - pure utility functions
 * @ai-exports validateActionResult, handleActionResult, isActionResult
 */

import type { ActionResult } from '$lib/types/ai-enforcement';

/**
 * Type guard to check if a value is an ActionResult
 */
export function isActionResult<T>(value: unknown): value is ActionResult<T> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'success' in value &&
		typeof (value as any).success === 'boolean'
	);
}

/**
 * Validates and extracts data from an ActionResult
 * Throws error if the result indicates failure
 */
export function validateActionResult<T>(result: ActionResult<T>): T {
	if (!result.success) {
		const errorMessage = `Action failed: ${result.error}${result.details ? ` (${result.details})` : ''}`;
		throw new Error(errorMessage);
	}
	return result.data;
}

/**
 * Handles an ActionResult with custom success and error callbacks
 */
export function handleActionResult<T>(
	result: ActionResult<T>,
	options: {
		onSuccess?: (data: T, sideEffects: string[]) => void;
		onError?: (error: string, recoverable: boolean, details?: string) => void;
		logSideEffects?: boolean;
	} = {}
): boolean {
	const { onSuccess, onError, logSideEffects = false } = options;

	if (result.success) {
		if (logSideEffects && result.sideEffects.length > 0) {
			console.info('Action side effects:', result.sideEffects);
		}
		onSuccess?.(result.data, result.sideEffects);
		return true;
	} else {
		onError?.(result.error, result.recoverable, result.details);
		return false;
	}
}

/**
 * Wraps a function to catch errors and return ActionResult
 */
export function wrapWithActionResult<TArgs extends unknown[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>,
	errorMessage: string = 'Operation failed'
): (...args: TArgs) => Promise<ActionResult<TReturn>> {
	return async (...args: TArgs): Promise<ActionResult<TReturn>> => {
		try {
			const result = await fn(...args);
			return {
				success: true,
				data: result,
				sideEffects: []
			};
		} catch (error: unknown) {
			const finalMessage = error instanceof Error ? error.message : errorMessage;
			return {
				success: false,
				error: finalMessage,
				recoverable: true
			};
		}
	};
}

/**
 * Creates a successful ActionResult
 */
export function createSuccessResult<T>(data: T, sideEffects: string[] = []): ActionResult<T> {
	return {
		success: true,
		data,
		sideEffects
	};
}

/**
 * Creates a failed ActionResult
 */
export function createErrorResult<T>(
	error: string,
	recoverable: boolean = true,
	details?: string
): ActionResult<T> {
	return {
		success: false,
		error,
		recoverable,
		details
	};
}

/**
 * Chains multiple ActionResults, stopping at the first failure
 */
export async function chainActionResults<T>(
	operations: Array<() => Promise<ActionResult<T>>>
): Promise<ActionResult<T[]>> {
	const results: T[] = [];
	const allSideEffects: string[] = [];

	for (const operation of operations) {
		const result = await operation();
		if (!result.success) {
			return result as ActionResult<T[]>;
		}
		results.push(result.data);
		allSideEffects.push(...result.sideEffects);
	}

	return {
		success: true,
		data: results,
		sideEffects: allSideEffects
	};
}