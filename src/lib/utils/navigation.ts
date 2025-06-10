// Navigation utilities
import { goto as svelteGoto } from '$app/navigation';
import type { UnknownError } from '$lib/types/ai-enforcement';

/**
 * Enhanced goto function with error handling
 */
export async function goto(url: string | URL, opts?: Parameters<typeof svelteGoto>[1]) {
  try {
    return await svelteGoto(url, opts);
  } catch (error: UnknownError) {
    console.error('Navigation error:', error);
    throw error;
  }
}

/**
 * Navigate with loading state
 */
export async function gotoWithLoading(url: string | URL, opts?: Parameters<typeof svelteGoto>[1]) {
  // You can integrate with loading store here if needed
  return goto(url, opts);
}