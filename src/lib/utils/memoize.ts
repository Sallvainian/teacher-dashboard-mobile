// src/lib/utils/memoize.ts
// Memoization utilities for optimizing expensive store computations

interface MemoizeOptions<TArgs extends unknown[], TResult> {
	maxSize?: number;
	ttl?: number; // time to live in milliseconds
	keyGenerator?: (...args: TArgs) => string;
	equalityCheck?: (a: TResult, b: TResult) => boolean;
}

interface CacheEntry<TResult> {
	value: TResult;
	timestamp: number;
	hitCount: number;
}

/**
 * Creates a memoized version of a function with configurable cache behavior
 */
export function memoize<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => TResult,
	options: MemoizeOptions<TArgs, TResult> = {}
): (...args: TArgs) => TResult {
	const {
		maxSize = 50,
		ttl = 300000, // 5 minutes default
		keyGenerator = (...args) => JSON.stringify(args)
	} = options;

	const cache = new Map<string, CacheEntry<TResult>>();
	const hitOrder: string[] = []; // Track access order for LRU eviction

	function evictExpired() {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of cache.entries()) {
			if (now - entry.timestamp > ttl) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => {
			cache.delete(key);
			const index = hitOrder.indexOf(key);
			if (index > -1) {
				hitOrder.splice(index, 1);
			}
		});
	}

	function evictLRU() {
		while (cache.size >= maxSize && hitOrder.length > 0) {
			const lruKey = hitOrder.shift()!;
			cache.delete(lruKey);
		}
	}

	function updateHitOrder(key: string) {
		const index = hitOrder.indexOf(key);
		if (index > -1) {
			hitOrder.splice(index, 1);
		}
		hitOrder.push(key);
	}

	const memoizedFn = (...args: TArgs): TResult => {
		// Clean up expired entries
		evictExpired();

		const key = keyGenerator(...args);
		const cached = cache.get(key);

		if (cached) {
			cached.hitCount++;
			updateHitOrder(key);
			return cached.value;
		}

		// Compute new result
		const result = fn(...args);

		// Evict LRU entries if needed
		evictLRU();

		// Cache the result
		cache.set(key, {
			value: result,
			timestamp: Date.now(),
			hitCount: 1
		});
		updateHitOrder(key);

		return result;
	};

	// Add cache inspection methods
	memoizedFn.cache = {
		clear: () => {
			cache.clear();
			hitOrder.length = 0;
		},
		size: () => cache.size,
		has: (key: string) => cache.has(key),
		delete: (key: string) => {
			const deleted = cache.delete(key);
			if (deleted) {
				const index = hitOrder.indexOf(key);
				if (index > -1) {
					hitOrder.splice(index, 1);
				}
			}
			return deleted;
		},
		stats: () => ({
			size: cache.size,
			totalHits: Array.from(cache.values()).reduce((sum, entry) => sum + entry.hitCount, 0),
			keys: Array.from(cache.keys())
		})
	};

	return memoizedFn;
}

/**
 * Specialized memoization for array operations with shallow comparison
 */
export function memoizeArrayOperation<TItem, TResult>(
	fn: (items: TItem[]) => TResult,
	options: Omit<MemoizeOptions<[TItem[]], TResult>, 'keyGenerator'> & {
		itemKeyExtractor?: (item: TItem) => string | number;
	} = {}
): (items: TItem[]) => TResult {
	const { itemKeyExtractor, ...memoizeOptions } = options;

	return memoize(fn, {
		...memoizeOptions,
		keyGenerator: (items: TItem[]) => {
			if (itemKeyExtractor) {
				// Create key based on item keys and their order
				return items.map(itemKeyExtractor).join(',');
			}
			// Fallback to length + hash of first/last items for performance
			if (items.length === 0) return 'empty';
			if (items.length === 1) return `single:${JSON.stringify(items[0])}`;
			return `${items.length}:${JSON.stringify(items[0])}:${JSON.stringify(items[items.length - 1])}`;
		}
	});
}

/**
 * Memoization specifically designed for file tree operations
 */
export function memoizeFileTreeOperation<TFolder, TResult>(
	fn: (folders: TFolder[]) => TResult,
	folderKeyExtractor: (folder: TFolder) => string
): (folders: TFolder[]) => TResult {
	return memoizeArrayOperation(fn, {
		maxSize: 10, // File tree shouldn't change too often
		ttl: 600000, // 10 minutes
		itemKeyExtractor: folderKeyExtractor
	});
}

/**
 * Memoization for search and filter operations with query-based caching
 */
export function memoizeSearchOperation<TItem, TResult>(
	fn: (items: TItem[], query: string, filters?: Record<string, unknown>) => TResult,
	options: {
		itemKeyExtractor?: (item: TItem) => string | number;
		maxSize?: number;
		ttl?: number;
	} = {}
): (items: TItem[], query: string, filters?: Record<string, unknown>) => TResult {
	const { itemKeyExtractor, maxSize = 100, ttl = 60000 } = options; // 1 minute TTL for searches

	return memoize(fn, {
		maxSize,
		ttl,
		keyGenerator: (items: TItem[], query: string, filters = {}) => {
			const itemsKey = itemKeyExtractor 
				? items.map(itemKeyExtractor).join(',')
				: `${items.length}`;
			const filtersKey = Object.keys(filters).length > 0 
				? JSON.stringify(filters) 
				: 'no-filters';
			return `${itemsKey}:${query.toLowerCase()}:${filtersKey}`;
		}
	});
}

/**
 * Create a memoized derived store that only recalculates when dependencies actually change
 */
export function createMemoizedDerived<TStores extends unknown[], TResult>(
	stores: TStores,
	deriveFn: (values: TStores) => TResult,
	options: {
		keyGenerator?: (values: TStores) => string;
		maxSize?: number;
		ttl?: number;
	} = {}
) {
	const memoizedDeriveFn = memoize(deriveFn, {
		maxSize: options.maxSize ?? 20,
		ttl: options.ttl ?? 300000, // 5 minutes
		keyGenerator: options.keyGenerator ?? ((values) => JSON.stringify(values))
	});

	return memoizedDeriveFn;
}

/**
 * Performance monitoring wrapper for memoized functions
 */
// Interface for the cache object exposed by memoized functions
export interface MemoizedCache {
	clear: () => void;
	size: () => number;
	has: (key: string) => boolean;
	delete: (key: string) => boolean;
	stats: () => {
		size: number;
		totalHits: number;
		keys: string[];
	};
}

export function withPerformanceMonitoring<TArgs extends unknown[], TResult>(
	memoizedFn: ((...args: TArgs) => TResult) & { cache: MemoizedCache },
	name: string
) {
	let callCount = 0;
	let totalTime = 0;

	const wrappedFn = (...args: TArgs): TResult => {
		const start = performance.now();
		const result = memoizedFn(...args);
		const end = performance.now();

		callCount++;
		totalTime += (end - start);

		// Log performance stats periodically
		if (callCount % 100 === 0) {
			const cacheStats = memoizedFn.cache.stats();
			const avgTime = totalTime / callCount;
			const hitRate = cacheStats.totalHits / callCount;

			console.group(`🔍 Performance Stats: ${name}`);
			console.log(`Calls: ${callCount}`);
			console.log(`Avg Time: ${avgTime.toFixed(2)}ms`);
			console.log(`Cache Hit Rate: ${(hitRate * 100).toFixed(1)}%`);
			console.log(`Cache Size: ${cacheStats.size}`);
			console.groupEnd();
		}

		return result;
	};

	// Preserve cache methods
	wrappedFn.cache = memoizedFn.cache;

	return wrappedFn;
}

/**
 * Utility to clear all memoization caches (useful for testing or memory management)
 */
export const memoizationManager = {
	registeredCaches: new Set<{ clear: () => void }>(),
	
	register(memoizedFn: { cache: { clear: () => void } }) {
		this.registeredCaches.add(memoizedFn.cache);
	},
	
	clearAll() {
		this.registeredCaches.forEach(cache => cache.clear());
	},
	
	unregister(memoizedFn: { cache: { clear: () => void } }) {
		this.registeredCaches.delete(memoizedFn.cache);
	}
};