/**
 * @ai-context MEM0_SERVICE - Memory layer service for AI-enhanced features
 * @ai-dependencies Supabase auth, environment variables
 * @ai-sideEffects Creates/updates memories in Mem0 platform
 * @ai-exports MemoryService class with CRUD operations
 */

import { Mem0 } from 'mem0ai';
import type { User } from '@supabase/supabase-js';

interface MemoryData {
	userId: string;
	message: string;
	metadata?: Record<string, any>;
}

interface Memory {
	id: string;
	memory: string;
	user_id: string;
	hash: string;
	metadata: Record<string, any>;
	created_at: string;
	updated_at: string;
}

class MemoryService {
	private mem0: Mem0;
	private initialized = false;

	constructor() {
		// Initialize with environment variables
		const apiKey = import.meta.env.VITE_MEM0_API_KEY;
		
		if (!apiKey) {
			console.warn('Mem0 API key not found. Memory features will be disabled.');
			return;
		}

		this.mem0 = new Mem0({
			apiKey: apiKey
		});
		this.initialized = true;
	}

	/**
	 * Check if Mem0 service is properly initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Add a new memory for a user
	 */
	async addMemory(data: MemoryData): Promise<Memory | null> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot add memory.');
			return null;
		}

		try {
			const response = await this.mem0.add(data.message, {
				user_id: data.userId,
				metadata: data.metadata || {}
			});

			return response as Memory;
		} catch (error) {
			console.error('Error adding memory:', error);
			return null;
		}
	}

	/**
	 * Get all memories for a specific user
	 */
	async getUserMemories(userId: string): Promise<Memory[]> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot get memories.');
			return [];
		}

		try {
			const response = await this.mem0.getAll({
				user_id: userId
			});

			return response.results || [];
		} catch (error) {
			console.error('Error getting user memories:', error);
			return [];
		}
	}

	/**
	 * Search memories by query
	 */
	async searchMemories(query: string, userId?: string): Promise<Memory[]> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot search memories.');
			return [];
		}

		try {
			const response = await this.mem0.search(query, {
				user_id: userId
			});

			return response.results || [];
		} catch (error) {
			console.error('Error searching memories:', error);
			return [];
		}
	}

	/**
	 * Update an existing memory
	 */
	async updateMemory(memoryId: string, newText: string): Promise<Memory | null> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot update memory.');
			return null;
		}

		try {
			const response = await this.mem0.update(memoryId, newText);
			return response as Memory;
		} catch (error) {
			console.error('Error updating memory:', error);
			return null;
		}
	}

	/**
	 * Delete a memory
	 */
	async deleteMemory(memoryId: string): Promise<boolean> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot delete memory.');
			return false;
		}

		try {
			await this.mem0.delete(memoryId);
			return true;
		} catch (error) {
			console.error('Error deleting memory:', error);
			return false;
		}
	}

	/**
	 * Get memory history for a specific memory ID
	 */
	async getMemoryHistory(memoryId: string): Promise<Memory[]> {
		if (!this.initialized) {
			console.warn('Mem0 not initialized. Cannot get memory history.');
			return [];
		}

		try {
			const response = await this.mem0.history(memoryId);
			return response.results || [];
		} catch (error) {
			console.error('Error getting memory history:', error);
			return [];
		}
	}

	/**
	 * Helper method to add student interaction memory
	 */
	async addStudentInteraction(
		user: User,
		studentId: string,
		interaction: string,
		context?: Record<string, any>
	): Promise<Memory | null> {
		const metadata = {
			type: 'student_interaction',
			student_id: studentId,
			timestamp: new Date().toISOString(),
			...context
		};

		return this.addMemory({
			userId: user.id,
			message: interaction,
			metadata
		});
	}

	/**
	 * Helper method to add teaching note memory
	 */
	async addTeachingNote(
		user: User,
		note: string,
		subject?: string,
		classId?: string
	): Promise<Memory | null> {
		const metadata = {
			type: 'teaching_note',
			subject,
			class_id: classId,
			timestamp: new Date().toISOString()
		};

		return this.addMemory({
			userId: user.id,
			message: note,
			metadata
		});
	}

	/**
	 * Helper method to get student-related memories
	 */
	async getStudentMemories(userId: string, studentId: string): Promise<Memory[]> {
		const allMemories = await this.getUserMemories(userId);
		return allMemories.filter(memory => 
			memory.metadata?.student_id === studentId
		);
	}
}

// Create and export singleton instance
export const memoryService = new MemoryService();
export type { Memory, MemoryData };