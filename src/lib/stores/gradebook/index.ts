// src/lib/stores/gradebook/index.ts
// Main gradebook store that combines all modules

// Core stores
import { store } from './core';

// Database operations
import { loadAllData } from './database';

// Student operations
import { 
	addGlobalStudent, 
	assignStudentToClass, 
	removeStudentFromClass, 
	importStudentsToClass 
} from './studentActions';

// Class operations
import { 
	addClass, 
	updateClass,
	deleteClass, 
	selectClass, 
	importClassesFromJSON 
} from './classActions';

// Assignment operations
import { 
	addAssignmentToClass, 
	updateAssignment, 
	deleteAssignment,
	bulkAddAssignments,
	generateAssignmentName,
	ASSIGNMENT_TEMPLATES
} from './assignmentActions';

// Grade operations
import { 
	recordGrade, 
	studentAverageInClass 
} from './gradeActions';

// Utility operations
import { 
	setUseSupabase, 
	ensureDataLoaded as ensureDataLoadedFull 
} from './utilityActions';

function createGradebookStore() {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return {
		// Main store subscription
		subscribe: store.subscribe,
		
		// Data loading
		loadAllData,
		ensureDataLoaded: ensureDataLoadedFull,
		
		// Student operations
		addGlobalStudent,
		assignStudentToClass,
		removeStudentFromClass,
		importStudentsToClass,
		
		// Class operations
		addClass,
		updateClass,
		deleteClass,
		selectClass,
		importClassesFromJSON,
		
		// Assignment operations
		addAssignmentToClass,
		updateAssignment,
		deleteAssignment,
		bulkAddAssignments,
		generateAssignmentName,
		ASSIGNMENT_TEMPLATES,
		
		// Grade operations
		recordGrade,
		studentAverageInClass,
		
		// Utility operations
		setUseSupabase
	};
}

export const gradebookStore = createGradebookStore();

// Export constants for external use
export { ASSIGNMENT_TEMPLATES } from './assignmentActions';