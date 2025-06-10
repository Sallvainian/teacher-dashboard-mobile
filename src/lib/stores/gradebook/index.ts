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
	clearAllData, 
	setUseSupabase, 
	ensureDataLoaded as ensureDataLoadedFull 
} from './utilityActions';

function createGradebookStore() {
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
		clearAllData,
		setUseSupabase
	};
}

export const gradebookStore = createGradebookStore();

// Export constants for external use
export { ASSIGNMENT_TEMPLATES } from './assignmentActions';