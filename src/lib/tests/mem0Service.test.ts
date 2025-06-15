/**
 * @ai-context MEM0_SERVICE_TESTS - Unit tests for Mem0 memory service
 * @ai-dependencies Vitest, mem0ai package
 * @ai-sideEffects None (mocked service calls)
 * @ai-exports Test suite for MemoryService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memoryService } from '../services/mem0Service';

// Mock the mem0ai module
vi.mock('mem0ai', () => ({
	Mem0: vi.fn().mockImplementation(() => ({
		add: vi.fn(),
		getAll: vi.fn(),
		search: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		history: vi.fn()
	}))
}));

// Mock environment variables
vi.mock('$env/static/public', () => ({
	VITE_MEM0_API_KEY: 'test-api-key'
}));

describe('MemoryService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Initialization', () => {
		it('should initialize properly with API key', () => {
			expect(memoryService.isInitialized()).toBe(true);
		});
	});

	describe('Memory Operations', () => {
		const mockUser = { id: 'user-123', email: 'test@example.com' };
		const mockMemory = {
			id: 'memory-123',
			memory: 'Test memory content',
			user_id: 'user-123',
			hash: 'abc123',
			metadata: { type: 'test' },
			created_at: '2025-01-15T10:00:00Z',
			updated_at: '2025-01-15T10:00:00Z'
		};

		it('should add a new memory', async () => {
			const mockAdd = vi.fn().mockResolvedValue(mockMemory);
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { add: mockAdd };

			const result = await memoryService.addMemory({
				userId: 'user-123',
				message: 'Test memory content',
				metadata: { type: 'test' }
			});

			expect(mockAdd).toHaveBeenCalledWith('Test memory content', {
				user_id: 'user-123',
				metadata: { type: 'test' }
			});
			expect(result).toEqual(mockMemory);
		});

		it('should get user memories', async () => {
			const mockGetAll = vi.fn().mockResolvedValue({ results: [mockMemory] });
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { getAll: mockGetAll };

			const result = await memoryService.getUserMemories('user-123');

			expect(mockGetAll).toHaveBeenCalledWith({ user_id: 'user-123' });
			expect(result).toEqual([mockMemory]);
		});

		it('should search memories', async () => {
			const mockSearch = vi.fn().mockResolvedValue({ results: [mockMemory] });
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { search: mockSearch };

			const result = await memoryService.searchMemories('test query', 'user-123');

			expect(mockSearch).toHaveBeenCalledWith('test query', { user_id: 'user-123' });
			expect(result).toEqual([mockMemory]);
		});

		it('should update a memory', async () => {
			const updatedMemory = { ...mockMemory, memory: 'Updated content' };
			const mockUpdate = vi.fn().mockResolvedValue(updatedMemory);
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { update: mockUpdate };

			const result = await memoryService.updateMemory('memory-123', 'Updated content');

			expect(mockUpdate).toHaveBeenCalledWith('memory-123', 'Updated content');
			expect(result).toEqual(updatedMemory);
		});

		it('should delete a memory', async () => {
			const mockDelete = vi.fn().mockResolvedValue(undefined);
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { delete: mockDelete };

			const result = await memoryService.deleteMemory('memory-123');

			expect(mockDelete).toHaveBeenCalledWith('memory-123');
			expect(result).toBe(true);
		});

		it('should get memory history', async () => {
			const mockHistory = vi.fn().mockResolvedValue({ results: [mockMemory] });
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { history: mockHistory };

			const result = await memoryService.getMemoryHistory('memory-123');

			expect(mockHistory).toHaveBeenCalledWith('memory-123');
			expect(result).toEqual([mockMemory]);
		});
	});

	describe('Helper Methods', () => {
		const mockUser = { id: 'user-123', email: 'test@example.com' };

		it('should add student interaction memory', async () => {
			const mockAdd = vi.fn().mockResolvedValue({
				id: 'memory-123',
				memory: 'Student had trouble with math',
				metadata: {
					type: 'student_interaction',
					student_id: 'student-456',
					subject: 'math'
				}
			});
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { add: mockAdd };

			const result = await memoryService.addStudentInteraction(
				mockUser,
				'student-456',
				'Student had trouble with math',
				{ subject: 'math' }
			);

			expect(mockAdd).toHaveBeenCalledWith('Student had trouble with math', {
				user_id: 'user-123',
				metadata: expect.objectContaining({
					type: 'student_interaction',
					student_id: 'student-456',
					subject: 'math',
					timestamp: expect.any(String)
				})
			});
			expect(result).toBeDefined();
		});

		it('should add teaching note memory', async () => {
			const mockAdd = vi.fn().mockResolvedValue({
				id: 'memory-124',
				memory: 'Remember to review fractions next week',
				metadata: {
					type: 'teaching_note',
					subject: 'math',
					class_id: 'class-789'
				}
			});
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { add: mockAdd };

			const result = await memoryService.addTeachingNote(
				mockUser,
				'Remember to review fractions next week',
				'math',
				'class-789'
			);

			expect(mockAdd).toHaveBeenCalledWith('Remember to review fractions next week', {
				user_id: 'user-123',
				metadata: expect.objectContaining({
					type: 'teaching_note',
					subject: 'math',
					class_id: 'class-789',
					timestamp: expect.any(String)
				})
			});
			expect(result).toBeDefined();
		});

		it('should filter student memories', async () => {
			const allMemories = [
				{
					id: 'memory-1',
					memory: 'Student A interaction',
					user_id: 'user-123',
					metadata: { student_id: 'student-A' }
				},
				{
					id: 'memory-2',
					memory: 'Student B interaction',
					user_id: 'user-123',
					metadata: { student_id: 'student-B' }
				},
				{
					id: 'memory-3',
					memory: 'General note',
					user_id: 'user-123',
					metadata: { type: 'general' }
				}
			];

			const mockGetAll = vi.fn().mockResolvedValue({ results: allMemories });
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { getAll: mockGetAll };

			const result = await memoryService.getStudentMemories('user-123', 'student-A');

			expect(result).toHaveLength(1);
			expect(result[0].metadata.student_id).toBe('student-A');
		});
	});

	describe('Error Handling', () => {
		it('should handle add memory errors gracefully', async () => {
			const mockAdd = vi.fn().mockRejectedValue(new Error('API Error'));
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { add: mockAdd };

			const result = await memoryService.addMemory({
				userId: 'user-123',
				message: 'Test memory'
			});

			expect(result).toBeNull();
		});

		it('should handle search errors gracefully', async () => {
			const mockSearch = vi.fn().mockRejectedValue(new Error('Search Error'));
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { search: mockSearch };

			const result = await memoryService.searchMemories('test query');

			expect(result).toEqual([]);
		});

		it('should handle delete errors gracefully', async () => {
			const mockDelete = vi.fn().mockRejectedValue(new Error('Delete Error'));
			// @ts-ignore - accessing private property for testing
			memoryService.mem0 = { delete: mockDelete };

			const result = await memoryService.deleteMemory('memory-123');

			expect(result).toBe(false);
		});
	});
});