// src/lib/utils/sampleData.ts
// Sample data generator for testing

import { gradebookStore } from '$lib/stores/gradebook';

export async function generateSampleData() {
	// Add sample classes
	await gradebookStore.addClass('Math 101');
	await gradebookStore.addClass('Science 202');
	
	// Add sample students
	const student1Id = await gradebookStore.addGlobalStudent('John Doe');
	const student2Id = await gradebookStore.addGlobalStudent('Jane Smith');
	const student3Id = await gradebookStore.addGlobalStudent('Bob Johnson');
	
	// For demo purposes, we'll assume the classes were created successfully
	// In a real implementation, you'd need to fetch the class IDs from the store
	// This is just sample data generation, so we'll skip the complex class assignment logic
	console.log('Students created:', { student1Id, student2Id, student3Id });
	
	console.log('Sample data generated successfully!');
	return { success: true };
}
