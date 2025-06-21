/**
 * @ai-context NETLIFY_CONTEXT_SEARCH - Search utility for Netlify coding guidelines and API reference
 * @ai-dependencies JSON data, TypeScript types
 * @ai-sideEffects None (read-only search operations)
 * @ai-exports Search functions for Netlify coding context
 */

import netlifyContext from '../data/netlify-coding-context.json';
import type { ActionResult, AIFunction } from '../types/ai-enforcement';

export interface NetlifyRule {
	rule: string;
	description: string;
	importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface NetlifyExample {
	code: string;
	description: string;
	language?: 'typescript' | 'javascript' | 'toml' | 'bash';
}

export interface NetlifyContextResult {
	section: string;
	subsection?: string;
	content: any;
	relevanceScore: number;
	matchType: 'title' | 'description' | 'keyword' | 'example';
	context?: string;
}

/**
 * Search Netlify coding context by query
 * @ai-flow INPUT: query -> TOKENIZE -> SEARCH_SECTIONS -> SORT_BY_RELEVANCE -> OUTPUT: results
 * @ai-sideEffects None - read-only operation
 */
export const searchNetlifyContext: AIFunction<[string], NetlifyContextResult[]> = 
	async (query: string): Promise<ActionResult<NetlifyContextResult[]>> => {
		try {
			const results: NetlifyContextResult[] = [];
			const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
			
			if (searchTerms.length === 0) {
				return { 
					success: true, 
					data: [], 
					sideEffects: [] 
				};
			}

			// Search through all sections
			Object.entries(netlifyContext).forEach(([sectionKey, sectionData]) => {
				if (sectionKey === 'metadata') return; // Skip metadata
				
				searchSection(sectionKey, sectionData, searchTerms, results);
			});

			// Sort by relevance score
			const sortedResults = results.sort((a, b) => b.relevanceScore - a.relevanceScore);
			
			return {
				success: true,
				data: sortedResults,
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to search Netlify context',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Recursively search through section data
 */
function searchSection(
	sectionKey: string, 
	sectionData: any, 
	searchTerms: string[], 
	results: NetlifyContextResult[],
	parentPath = ''
): void {
	const currentPath = parentPath ? `${parentPath}.${sectionKey}` : sectionKey;
	
	if (typeof sectionData === 'object' && sectionData !== null) {
		// Check if this is a searchable content object
		if (hasSearchableContent(sectionData)) {
			const score = calculateRelevanceScore(sectionData, searchTerms);
			if (score > 0) {
				results.push({
					section: currentPath,
					content: sectionData,
					relevanceScore: score,
					matchType: getMatchType(sectionData, searchTerms),
					context: getContext(sectionData)
				});
			}
		}
		
		// Recursively search nested objects
		Object.entries(sectionData).forEach(([key, value]) => {
			if (typeof value === 'object' && value !== null) {
				searchSection(key, value, searchTerms, results, currentPath);
			}
		});
	}
}

/**
 * Check if object has searchable content
 */
function hasSearchableContent(obj: any): boolean {
	return obj && (
		obj.title || 
		obj.description || 
		obj.rule || 
		obj.code || 
		obj.examples ||
		Array.isArray(obj)
	);
}

/**
 * Calculate relevance score for content
 */
function calculateRelevanceScore(content: any, searchTerms: string[]): number {
	let score = 0;
	const text = getSearchableText(content).toLowerCase();
	
	searchTerms.forEach(term => {
		// Title matches (highest priority)
		if (content.title && content.title.toLowerCase().includes(term)) {
			score += 10;
		}
		
		// Rule matches (high priority)
		if (content.rule && content.rule.toLowerCase().includes(term)) {
			score += 8;
		}
		
		// Description matches (medium priority)
		if (content.description && content.description.toLowerCase().includes(term)) {
			score += 6;
		}
		
		// Code example matches (medium priority)
		if (content.code && content.code.toLowerCase().includes(term)) {
			score += 5;
		}
		
		// General text matches (lower priority)
		if (text.includes(term)) {
			score += 3;
		}
		
		// Exact matches get bonus
		if (text.includes(term) && term.length > 4) {
			score += 2;
		}
	});
	
	return score;
}

/**
 * Get searchable text from content
 */
function getSearchableText(content: any): string {
	const textParts: string[] = [];
	
	if (content.title) textParts.push(content.title);
	if (content.description) textParts.push(content.description);
	if (content.rule) textParts.push(content.rule);
	if (content.code) textParts.push(content.code);
	
	// Handle arrays
	if (Array.isArray(content)) {
		content.forEach(item => {
			if (typeof item === 'string') {
				textParts.push(item);
			} else if (typeof item === 'object') {
				textParts.push(getSearchableText(item));
			}
		});
	}
	
	// Handle nested objects
	if (typeof content === 'object' && content !== null) {
		Object.values(content).forEach(value => {
			if (typeof value === 'string') {
				textParts.push(value);
			}
		});
	}
	
	return textParts.join(' ');
}

/**
 * Determine match type
 */
function getMatchType(content: any, searchTerms: string[]): NetlifyContextResult['matchType'] {
	const titleText = content.title?.toLowerCase() || '';
	const descText = content.description?.toLowerCase() || '';
	const codeText = content.code?.toLowerCase() || '';
	
	for (const term of searchTerms) {
		if (titleText.includes(term)) return 'title';
		if (codeText.includes(term)) return 'example';
		if (descText.includes(term)) return 'description';
	}
	
	return 'keyword';
}

/**
 * Get context information
 */
function getContext(content: any): string {
	if (content.importance) return `Importance: ${content.importance}`;
	if (content.language) return `Language: ${content.language}`;
	if (content.runtime) return `Runtime: ${content.runtime}`;
	return '';
}

/**
 * Search by function type
 * @ai-flow INPUT: type -> MAP_TO_SECTION -> FETCH_DATA -> OUTPUT: results
 * @ai-sideEffects None - read-only operation
 */
export const searchByFunctionType: AIFunction<['serverless' | 'edge' | 'background' | 'scheduled'], NetlifyContextResult[]> =
	async (type: 'serverless' | 'edge' | 'background' | 'scheduled'): Promise<ActionResult<NetlifyContextResult[]>> => {
		try {
			const typeMap = {
				'serverless': 'serverless_functions',
				'edge': 'edge_functions', 
				'background': 'background_functions',
				'scheduled': 'scheduled_functions'
			};
			
			const sectionKey = typeMap[type];
			const sectionData = netlifyContext[sectionKey as keyof typeof netlifyContext];
			
			if (!sectionData) {
				return {
					success: true,
					data: [],
					sideEffects: []
				};
			}
			
			return {
				success: true,
				data: [{
					section: sectionKey,
					content: sectionData,
					relevanceScore: 10,
					matchType: 'title'
				}],
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to search by function type',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Search by capability
 * @ai-flow INPUT: capability -> MAP_TO_SECTION -> FETCH_DATA -> OUTPUT: results
 * @ai-sideEffects None - read-only operation
 */
export const searchByCapability: AIFunction<[string], NetlifyContextResult[]> =
	async (capability: string): Promise<ActionResult<NetlifyContextResult[]>> => {
		try {
			const capabilityMap: Record<string, string> = {
				'blobs': 'netlify_blobs',
				'storage': 'netlify_blobs',
				'images': 'image_cdn',
				'cdn': 'image_cdn',
				'environment': 'environment_variables',
				'env': 'environment_variables',
				'forms': 'netlify_forms',
				'database': 'netlify_db',
				'db': 'netlify_db',
				'neon': 'netlify_db'
			};
			
			const sectionKey = capabilityMap[capability.toLowerCase()];
			if (!sectionKey) {
				return {
					success: true,
					data: [],
					sideEffects: []
				};
			}
			
			const sectionData = netlifyContext[sectionKey as keyof typeof netlifyContext];
			if (!sectionData) {
				return {
					success: true,
					data: [],
					sideEffects: []
				};
			}
			
			return {
				success: true,
				data: [{
					section: sectionKey,
					content: sectionData,
					relevanceScore: 10,
					matchType: 'title'
				}],
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to search by capability',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Get examples by type
 * @ai-flow INPUT: type -> SEARCH_SECTIONS -> COLLECT_EXAMPLES -> OUTPUT: examples
 * @ai-sideEffects None - read-only operation
 */
export const getExamplesByType: AIFunction<['typescript' | 'javascript' | 'toml' | 'bash'], NetlifyExample[]> =
	async (type: 'typescript' | 'javascript' | 'toml' | 'bash'): Promise<ActionResult<NetlifyExample[]>> => {
		try {
			const examples: NetlifyExample[] = [];
			
			// Search through all sections for examples
			Object.values(netlifyContext).forEach(section => {
				if (typeof section === 'object' && section !== null) {
					findExamples(section, type, examples);
				}
			});
			
			return {
				success: true,
				data: examples,
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to get examples by type',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Recursively find examples of specific type
 */
function findExamples(obj: any, type: string, examples: NetlifyExample[]): void {
	if (typeof obj !== 'object' || obj === null) return;
	
	Object.entries(obj).forEach(([key, value]) => {
		// Check if this is an example object
		if (key === 'examples' && typeof value === 'object' && value !== null) {
			Object.entries(value).forEach(([exampleKey, example]) => {
				if (typeof example === 'object' && example !== null) {
					if (exampleKey.includes(type) || (example as any).language === type) {
						examples.push({
							code: (example as any).code || (example as any),
							description: (example as any).description || exampleKey,
							language: type as any
						});
					}
				}
			});
		}
		
		// Check for direct code examples
		if (key === 'code' && typeof value === 'string') {
			examples.push({
				code: value,
				description: obj.description || 'Code example',
				language: obj.language || type as any
			});
		}
		
		// Recursively search
		if (typeof value === 'object') {
			findExamples(value, type, examples);
		}
	});
}

/**
 * Get all rules by importance
 * @ai-flow INPUT: importance -> FILTER_RULES -> SORT_BY_IMPORTANCE -> OUTPUT: rules
 * @ai-sideEffects None - read-only operation
 */
export const getRulesByImportance: AIFunction<[('critical' | 'high' | 'medium' | 'low' | undefined)], NetlifyRule[]> =
	async (importance?: 'critical' | 'high' | 'medium' | 'low'): Promise<ActionResult<NetlifyRule[]>> => {
		try {
			const rules: NetlifyRule[] = [];
			
			// Extract rules from general_rules section
			const generalRules = netlifyContext.general_rules;
			if (generalRules && generalRules.rules) {
				generalRules.rules.forEach((rule: any) => {
					if (!importance || rule.importance === importance) {
						rules.push(rule);
					}
				});
			}
			
			const sortedRules = rules.sort((a, b) => {
				const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
				return importanceOrder[b.importance] - importanceOrder[a.importance];
			});
			
			return {
				success: true,
				data: sortedRules,
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to get rules by importance',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Get quick reference for specific topic
 * @ai-flow INPUT: topic -> MAP_TO_SECTION -> FETCH_DATA -> OUTPUT: reference
 * @ai-sideEffects None - read-only operation
 */
export const getQuickReference: AIFunction<[string], NetlifyContextResult | null> =
	async (topic: string): Promise<ActionResult<NetlifyContextResult | null>> => {
		try {
			const topicMap: Record<string, string> = {
				'functions': 'serverless_functions',
				'edge': 'edge_functions',
				'blobs': 'netlify_blobs',
				'images': 'image_cdn',
				'env': 'environment_variables',
				'forms': 'netlify_forms',
				'db': 'netlify_db',
				'database': 'netlify_db'
			};
			
			const sectionKey = topicMap[topic.toLowerCase()];
			if (!sectionKey) {
				return {
					success: true,
					data: null,
					sideEffects: []
				};
			}
			
			const sectionData = netlifyContext[sectionKey as keyof typeof netlifyContext];
			if (!sectionData) {
				return {
					success: true,
					data: null,
					sideEffects: []
				};
			}
			
			return {
				success: true,
				data: {
					section: sectionKey,
					content: sectionData,
					relevanceScore: 10,
					matchType: 'title'
				},
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to get quick reference',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Get development statistics
 * @ai-flow INPUT: none -> COUNT_SECTIONS -> COUNT_ITEMS -> OUTPUT: stats
 * @ai-sideEffects None - read-only operation
 */
export const getContextStats: AIFunction<[], { sections: number; capabilities: number; fileTypes: number; examples: number; rules: number; version?: string; lastUpdated?: string }> =
	async (): Promise<ActionResult<{ sections: number; capabilities: number; fileTypes: number; examples: number; rules: number; version?: string; lastUpdated?: string }>> => {
		try {
			const sections = Object.keys(netlifyContext).filter(key => key !== 'metadata').length;
			const capabilities = netlifyContext.metadata?.capabilities?.length || 0;
			const fileTypes = netlifyContext.metadata?.file_types?.length || 0;
			
			// Count examples
			let exampleCount = 0;
			let ruleCount = 0;
			
			Object.values(netlifyContext).forEach(section => {
				if (typeof section === 'object' && section !== null) {
					countItems(section, 'examples', (count) => { exampleCount += count; });
					countItems(section, 'rules', (count) => { ruleCount += count; });
				}
			});
			
			return {
				success: true,
				data: {
					sections,
					capabilities,
					fileTypes,
					examples: exampleCount,
					rules: ruleCount,
					version: netlifyContext.metadata?.version,
					lastUpdated: netlifyContext.metadata?.created
				},
				sideEffects: []
			};
		} catch (error: any) {
			return {
				success: false,
				error: 'Failed to get context statistics',
				details: error?.message || 'Unknown error',
				recoverable: true
			};
		}
	};

/**
 * Helper to count items recursively
 */
function countItems(obj: any, type: string, callback: (count: number) => void): void {
	if (typeof obj !== 'object' || obj === null) return;
	
	Object.entries(obj).forEach(([key, value]) => {
		if (key === type && Array.isArray(value)) {
			callback(value.length);
		} else if (key === type && typeof value === 'object' && value !== null) {
			callback(Object.keys(value).length);
		} else if (typeof value === 'object') {
			countItems(value, type, callback);
		}
	});
}