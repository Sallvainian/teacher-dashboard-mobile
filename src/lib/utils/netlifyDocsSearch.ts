/**
 * @ai-context NETLIFY_DOCS_SEARCH - Search utility for Netlify documentation
 * @ai-dependencies JSON data, search algorithms
 * @ai-sideEffects None (read-only search operations)
 * @ai-exports Search functions for Netlify documentation
 */

import netlifyDocs from '../data/netlify-docs.json';

export interface NetlifyDoc {
	title: string;
	url: string;
	description: string;
	tags: string[];
	use_cases: string[];
}

export interface NetlifyCategory {
	title: string;
	description: string;
	tags: string[];
	docs: NetlifyDoc[];
}

export interface SearchResult {
	doc: NetlifyDoc;
	category: string;
	relevanceScore: number;
	matchType: 'title' | 'description' | 'tag' | 'use_case';
}

/**
 * Search Netlify documentation by query string
 */
export function searchNetlifyDocs(query: string): SearchResult[] {
	const results: SearchResult[] = [];
	const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
	
	if (searchTerms.length === 0) return results;

	// Search through all categories
	Object.entries(netlifyDocs.categories).forEach(([categoryKey, category]) => {
		const categoryData = category as NetlifyCategory;
		
		categoryData.docs.forEach((doc) => {
			let relevanceScore = 0;
			let matchType: SearchResult['matchType'] = 'description';

			// Check title matches (highest priority)
			const titleMatch = searchTerms.some(term => 
				doc.title.toLowerCase().includes(term)
			);
			if (titleMatch) {
				relevanceScore += 10;
				matchType = 'title';
			}

			// Check tag matches (high priority)
			const tagMatch = searchTerms.some(term =>
				doc.tags.some(tag => tag.toLowerCase().includes(term))
			);
			if (tagMatch) {
				relevanceScore += 8;
				if (matchType === 'description') matchType = 'tag';
			}

			// Check use case matches (medium priority)
			const useCaseMatch = searchTerms.some(term =>
				doc.use_cases.some(useCase => useCase.toLowerCase().includes(term))
			);
			if (useCaseMatch) {
				relevanceScore += 6;
				if (matchType === 'description') matchType = 'use_case';
			}

			// Check description matches (lower priority)
			const descriptionMatch = searchTerms.some(term =>
				doc.description.toLowerCase().includes(term)
			);
			if (descriptionMatch) {
				relevanceScore += 4;
			}

			// Add to results if any match found
			if (relevanceScore > 0) {
				results.push({
					doc,
					category: categoryData.title,
					relevanceScore,
					matchType
				});
			}
		});
	});

	// Sort by relevance score (highest first)
	return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get documentation by category
 */
export function getDocsByCategory(categoryKey: string): NetlifyCategory | null {
	const category = netlifyDocs.categories[categoryKey as keyof typeof netlifyDocs.categories];
	return category as NetlifyCategory || null;
}

/**
 * Get all categories
 */
export function getAllCategories(): Record<string, NetlifyCategory> {
	return netlifyDocs.categories as Record<string, NetlifyCategory>;
}

/**
 * Get docs by tag
 */
export function getDocsByTag(tag: string): SearchResult[] {
	const results: SearchResult[] = [];
	
	Object.entries(netlifyDocs.categories).forEach(([categoryKey, category]) => {
		const categoryData = category as NetlifyCategory;
		
		categoryData.docs.forEach((doc) => {
			if (doc.tags.some(docTag => docTag.toLowerCase() === tag.toLowerCase())) {
				results.push({
					doc,
					category: categoryData.title,
					relevanceScore: 10,
					matchType: 'tag'
				});
			}
		});
	});

	return results;
}

/**
 * Get docs by use case
 */
export function getDocsByUseCase(useCase: string): SearchResult[] {
	const results: SearchResult[] = [];
	
	Object.entries(netlifyDocs.categories).forEach(([categoryKey, category]) => {
		const categoryData = category as NetlifyCategory;
		
		categoryData.docs.forEach((doc) => {
			if (doc.use_cases.some(docUseCase => 
				docUseCase.toLowerCase().includes(useCase.toLowerCase())
			)) {
				results.push({
					doc,
					category: categoryData.title,
					relevanceScore: 8,
					matchType: 'use_case'
				});
			}
		});
	});

	return results;
}

/**
 * Get random documentation suggestions
 */
export function getRandomDocs(count: number = 5): SearchResult[] {
	const allDocs: SearchResult[] = [];
	
	Object.entries(netlifyDocs.categories).forEach(([categoryKey, category]) => {
		const categoryData = category as NetlifyCategory;
		
		categoryData.docs.forEach((doc) => {
			allDocs.push({
				doc,
				category: categoryData.title,
				relevanceScore: Math.random() * 10,
				matchType: 'description'
			});
		});
	});

	// Shuffle and return requested count
	return allDocs
		.sort(() => Math.random() - 0.5)
		.slice(0, count);
}

/**
 * Get popular tags
 */
export function getPopularTags(): string[] {
	const tagCounts: Record<string, number> = {};
	
	Object.values(netlifyDocs.categories).forEach((category) => {
		const categoryData = category as NetlifyCategory;
		categoryData.docs.forEach((doc) => {
			doc.tags.forEach((tag) => {
				tagCounts[tag] = (tagCounts[tag] || 0) + 1;
			});
		});
	});

	return Object.entries(tagCounts)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 20)
		.map(([tag]) => tag);
}

/**
 * Get documentation statistics
 */
export function getDocsStats() {
	const categories = Object.keys(netlifyDocs.categories).length;
	const totalDocs = Object.values(netlifyDocs.categories)
		.reduce((sum, category) => sum + (category as NetlifyCategory).docs.length, 0);
	
	const allTags = new Set<string>();
	const allUseCases = new Set<string>();
	
	Object.values(netlifyDocs.categories).forEach((category) => {
		const categoryData = category as NetlifyCategory;
		categoryData.docs.forEach((doc) => {
			doc.tags.forEach((tag) => allTags.add(tag));
			doc.use_cases.forEach((useCase) => allUseCases.add(useCase));
		});
	});

	return {
		categories,
		totalDocs,
		uniqueTags: allTags.size,
		uniqueUseCases: allUseCases.size,
		lastUpdated: netlifyDocs.metadata.created
	};
}