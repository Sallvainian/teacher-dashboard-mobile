<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { gradebookStore } from '$stores/gradebook';

	// Seating chart state
	let selectedClassId = $state<string | null>(null);
	let gridRows = $state(20);
	let gridCols = $state(30);
	let teacherDesk = $state({ row: 0, col: 15 });
	let seatingData = $state<(string | null)[][]>([]);
	let draggedStudent = $state<string | null>(null);
	let selectedStudent = $state<string | null>(null);
	let isDraggingTeacherDesk = $state(false);
	let editMode = $state(false);
	
	// Layout mode for dragging seats themselves
	let layoutMode = $state(false);
	let seatLayout = $state<Set<string>>(new Set()); // Track which positions have seats
	let draggedSeat = $state<{row: number, col: number} | null>(null);

	// Student data from gradebook
	let students = $derived($gradebookStore.students);
	let classes = $derived($gradebookStore.classes);
	let selectedClass = $derived(
		selectedClassId ? classes.find(c => c.id === selectedClassId) : null
	);
	let classStudents = $derived(
		selectedClass ? students.filter(s => selectedClass.studentIds.includes(s.id)) : []
	);

	// Unassigned students (not in seating chart)
	let unassignedStudents = $derived(
		classStudents.filter(student => {
			return !seatingData.some(row => row.some(seat => seat === student.id));
		})
	);

	onMount(async () => {
		await gradebookStore.ensureDataLoaded();
		if (classes.length > 0 && classes[0]) {
			selectedClassId = classes[0].id;
		}
	});

	// Reactive effect that handles seating chart initialization when class changes
	$effect(() => {
		if (selectedClassId) {
			initializeSeatingChart();
		}
	});

	function initializeSeatingChart() {
		if (!selectedClassId) return;
		
		// Try to load saved chart first
		try {
			const saved = localStorage.getItem(`seating-chart-${selectedClassId}`);
			if (saved) {
				const chartData = JSON.parse(saved);
				gridRows = chartData.rows || 20;
				gridCols = chartData.cols || 30;
				teacherDesk = chartData.teacherDesk || { row: 0, col: 15 };
				seatingData = chartData.seatingData || Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
				
				// Initialize seat layout - load saved layout or create default
				if (chartData.seatLayout) {
					seatLayout = new Set(chartData.seatLayout);
				} else {
					// Default: create seats in a classroom-like pattern (leaving aisles)
					createDefaultSeatLayout();
				}
			} else {
				// Create empty seating chart grid if no saved data
				seatingData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
				createDefaultSeatLayout();
			}
		} catch (error) {
			console.error('Error loading seating chart:', error);
			// Create empty seating chart grid on error
			seatingData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
			createDefaultSeatLayout();
		}
	}
	
	function createDefaultSeatLayout() {
		const newSeatLayout = new Set<string>();
		
		// Create a reasonable classroom layout - just 30 seats total
		// 5 rows of 6 seats with a center aisle
		for (let row = 3; row < 8; row++) { // Rows 3-7 (5 rows)
			for (let col = 10; col < 20; col++) { // Centered in the grid
				// Skip center columns for aisle
				if (col !== 14 && col !== 15) { // Center aisle
					newSeatLayout.add(`${row}-${col}`);
				}
			}
		}
		
		seatLayout = newSeatLayout;
	}

	function saveSeatingChart() {
		if (!selectedClassId) return;
		
		const chartData = {
			classId: selectedClassId,
			rows: gridRows,
			cols: gridCols,
			teacherDesk,
			seatingData,
			seatLayout: Array.from(seatLayout),
			lastUpdated: new Date().toISOString()
		};
		
		localStorage.setItem(`seating-chart-${selectedClassId}`, JSON.stringify(chartData));
	}


	function handleClassChange(classId: string) {
		selectedClassId = classId;
		// The $effect will automatically handle initialization
	}

	function handleDragStart(event: DragEvent, studentId: string) {
		if (event.dataTransfer) {
			event.dataTransfer.setData('text/plain', studentId);
			draggedStudent = studentId;
		}
	}

	function handleTeacherDeskDragStart(event: DragEvent) {
		if (event.dataTransfer) {
			event.dataTransfer.setData('text/plain', 'teacher-desk');
			isDraggingTeacherDesk = true;
		}
	}

	function handleSeatDragStart(event: DragEvent, row: number, col: number) {
		if (event.dataTransfer && layoutMode) {
			event.dataTransfer.setData('text/plain', `seat-${row}-${col}`);
			draggedSeat = { row, col };
		}
	}

	function addSeat(row: number, col: number) {
		if (row !== teacherDesk.row || col !== teacherDesk.col) {
			seatLayout.add(`${row}-${col}`);
			saveSeatingChart();
		}
	}

	function removeSeat(row: number, col: number) {
		const seatKey = `${row}-${col}`;
		seatLayout.delete(seatKey);
		
		// Remove any student sitting in this seat
		if (seatingData[row] && seatingData[row][col]) {
			seatingData[row][col] = null;
		}
		
		saveSeatingChart();
	}

	function moveSeat(fromRow: number, fromCol: number, toRow: number, toCol: number) {
		const fromKey = `${fromRow}-${fromCol}`;
		const toKey = `${toRow}-${toCol}`;
		
		// Can't move seat to teacher desk position
		if (toRow === teacherDesk.row && toCol === teacherDesk.col) {
			return;
		}
		
		// Remove from old position
		seatLayout.delete(fromKey);
		
		// If there's already a seat at destination, swap them
		if (seatLayout.has(toKey)) {
			seatLayout.add(fromKey);
		}
		
		// Add to new position
		seatLayout.add(toKey);
		
		// Move student if they were sitting in the moved seat
		const studentId = seatingData[fromRow] && seatingData[fromRow][fromCol] ? seatingData[fromRow][fromCol] : null;
		if (studentId) {
			// Move student to new seat position
			if (seatingData[fromRow]) seatingData[fromRow][fromCol] = null;
			if (seatingData[toRow]) seatingData[toRow][toCol] = studentId;
		}
		
		saveSeatingChart();
	}

	function moveTeacherDesk(newRow: number, newCol: number) {
		// Check if the new position would conflict with a student
		if (seatingData[newRow] && seatingData[newRow][newCol]) {
			// Move the student to the old teacher desk position if possible
			const studentId = seatingData[newRow][newCol];
			if (seatingData[teacherDesk.row]) {
				seatingData[teacherDesk.row][teacherDesk.col] = studentId;
			}
			seatingData[newRow][newCol] = null;
		}
		
		teacherDesk = { row: newRow, col: newCol };
		saveSeatingChart();
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		// Add visual feedback for valid drop zone
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.style.backgroundColor = 'rgba(139, 69, 19, 0.1)'; // Light brown background
			event.currentTarget.style.borderColor = 'rgb(139, 69, 19)'; // Brown border
		}
	}

	function handleDragLeave(event: DragEvent) {
		// Remove visual feedback when drag leaves
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.style.backgroundColor = '';
			event.currentTarget.style.borderColor = '';
		}
	}

	function handleDrop(event: DragEvent, row: number, col: number) {
		event.preventDefault();
		
		// Clear visual feedback
		if (event.currentTarget instanceof HTMLElement) {
			event.currentTarget.style.backgroundColor = '';
			event.currentTarget.style.borderColor = '';
		}
		
		const dragData = event.dataTransfer?.getData('text/plain');
		
		if (dragData === 'teacher-desk' && isDraggingTeacherDesk) {
			// Moving teacher desk
			moveTeacherDesk(row, col);
			isDraggingTeacherDesk = false;
		} else if (dragData && dragData.startsWith('seat-') && draggedSeat) {
			// Moving a seat in layout mode
			const [, fromRowStr, fromColStr] = dragData.split('-');
			const fromRow = parseInt(fromRowStr);
			const fromCol = parseInt(fromColStr);
			moveSeat(fromRow, fromCol, row, col);
			draggedSeat = null;
		} else if (dragData && draggedStudent) {
			// Check if trying to drop on teacher desk position
			if (row === teacherDesk.row && col === teacherDesk.col) {
				draggedStudent = null;
				return; // Can't place student on teacher desk
			}
			
			// Check if trying to drop on a position without a seat
			if (!seatLayout.has(`${row}-${col}`)) {
				draggedStudent = null;
				return; // Can't place student where there's no seat
			}
			
			// Get the student currently in the target seat (if any)
			const targetStudentId = seatingData[row] && seatingData[row][col] ? seatingData[row][col] : null;
			
			// Find the current position of the dragged student
			let draggedStudentPosition: { row: number; col: number } | null = null;
			for (let r = 0; r < seatingData.length; r++) {
				if (seatingData[r]) {
					for (let c = 0; c < seatingData[r].length; c++) {
						if (seatingData[r][c] === dragData) {
							draggedStudentPosition = { row: r, col: c };
							break;
						}
					}
				}
				if (draggedStudentPosition) break;
			}
			
			// Perform the seat swap or move
			if (seatingData[row]) {
				// Place dragged student in target position
				seatingData[row][col] = dragData;
				
				// If there was a student in the target seat, move them to the dragged student's old position
				if (targetStudentId && draggedStudentPosition && seatingData[draggedStudentPosition.row]) {
					seatingData[draggedStudentPosition.row][draggedStudentPosition.col] = targetStudentId;
				} else if (draggedStudentPosition && seatingData[draggedStudentPosition.row]) {
					// Just clear the old position if no swap needed
					seatingData[draggedStudentPosition.row][draggedStudentPosition.col] = null;
				}
			}
			
			draggedStudent = null;
			saveSeatingChart();
		}
	}

	function removeStudentFromSeat(row: number, col: number) {
		if (seatingData[row]) {
			seatingData[row][col] = null;
			saveSeatingChart();
		}
	}

	function getStudentById(id: string) {
		return students.find(s => s.id === id);
	}

	function getStudentInitials(student: any) {
		if (!student || !student.name) return '?';
		const parts = student.name.split(' ').filter(part => part.length > 0);
		if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return student.name.substring(0, 2).toUpperCase();
	}

	function resizeGrid(newRows: number, newCols: number) {
		// Save current data
		const currentData = [...seatingData];
		
		// Create new grid
		const newData = Array(newRows).fill(null).map(() => Array(newCols).fill(null));
		
		// Copy over existing data that fits
		for (let r = 0; r < Math.min(currentData.length, newRows); r++) {
			for (let c = 0; c < Math.min(currentData[r].length, newCols); c++) {
				newData[r][c] = currentData[r][c];
			}
		}
		
		gridRows = newRows;
		gridCols = newCols;
		seatingData = newData;
		saveSeatingChart();
	}

	function clearSeatingChart() {
		if (confirm('Are you sure you want to clear the entire seating chart?')) {
			// Create empty seating chart grid
			seatingData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
			saveSeatingChart();
		}
	}

	function expandWorkspace() {
		if (confirm('Expand to a much larger workspace? This will clear current layout.')) {
			gridRows = 20;
			gridCols = 30;
			teacherDesk = { row: 0, col: 15 };
			seatingData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
			createDefaultSeatLayout();
			saveSeatingChart();
		}
	}

	function randomizeSeating() {
		if (confirm('Randomly assign all students to seats?')) {
			// Clear current seating
			seatingData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
			
			// Get available seats (only where seats exist, excluding teacher desk)
			const availableSeats: {row: number, col: number}[] = [];
			for (let r = 0; r < gridRows; r++) {
				for (let c = 0; c < gridCols; c++) {
					if (!(r === teacherDesk.row && c === teacherDesk.col) && seatLayout.has(`${r}-${c}`)) {
						availableSeats.push({ row: r, col: c });
					}
				}
			}
			
			// Shuffle both students and seats for random assignment
			const shuffledStudents = [...classStudents].sort(() => Math.random() - 0.5);
			const shuffledSeats = [...availableSeats].sort(() => Math.random() - 0.5);
			
			// Assign students to random seats
			for (let i = 0; i < Math.min(shuffledStudents.length, shuffledSeats.length); i++) {
				const seat = shuffledSeats[i];
				if (seatingData[seat.row]) {
					seatingData[seat.row][seat.col] = shuffledStudents[i].id;
				}
			}
			
			saveSeatingChart();
		}
	}
</script>

<div class="min-h-screen bg-bg-base">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto('/dashboard')}
					class="p-2 bg-card border border-border rounded-lg hover:bg-surface transition-colors"
					title="Back to Dashboard"
					aria-label="Back to Dashboard"
				>
					<svg class="w-5 h-5 text-text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M19 12H5M12 19l-7-7 7-7"/>
					</svg>
				</button>
				<div>
					<h1 class="text-3xl font-bold text-highlight">Seating Chart</h1>
					<p class="text-text-base">Organize your classroom layout</p>
				</div>
			</div>
			
			<div class="flex items-center gap-4">
				{#if selectedClass}
					<div class="text-center">
						<div class="text-2xl font-bold text-highlight">{classStudents.length}</div>
						<div class="text-sm text-muted">Students</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-purple">{gridRows * gridCols - 1}</div>
						<div class="text-sm text-muted">Seats</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Class Selection -->
		<div class="mb-8">
			<div class="bg-card border border-border rounded-lg p-6">
				<h3 class="text-lg font-semibold text-highlight mb-4">Select Class</h3>
				
				{#if classes.length > 0}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{#each classes as classItem (classItem.id)}
							<button
								onclick={() => handleClassChange(classItem.id)}
								class="p-4 rounded-lg border-2 transition-all duration-200 text-left
									{selectedClassId === classItem.id 
										? 'border-purple bg-purple/10 text-highlight' 
										: 'border-border bg-surface hover:border-purple/50 text-text-base'}"
							>
								<div class="font-medium mb-1">{classItem.name}</div>
								<div class="text-sm text-muted">{classItem.studentIds.length} students</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8">
						<svg class="w-16 h-16 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
						</svg>
						<p class="text-muted">No classes found. Create a class in the gradebook first.</p>
						<button
							onclick={() => goto('/gradebook')}
							class="mt-4 px-4 py-2 bg-purple text-highlight rounded-lg hover:bg-purple-hover transition-colors"
						>
							Go to Gradebook
						</button>
					</div>
				{/if}
			</div>
		</div>

		{#if selectedClass}
			<div class="grid grid-cols-1 lg:grid-cols-6 gap-6">
				<!-- Seating Chart -->
				<div class="lg:col-span-5">
					<div class="bg-card border border-border rounded-lg p-6">
						<div class="flex items-center justify-between mb-6">
							<h3 class="text-lg font-semibold text-highlight">Classroom Layout</h3>
							<div class="flex items-center gap-2">
								<button
									onclick={() => {
										if (layoutMode) {
											layoutMode = false;
											editMode = false;
										} else {
											layoutMode = !layoutMode;
											editMode = false;
										}
									}}
									class="px-3 py-2 text-sm rounded-lg transition-colors {layoutMode ? 'bg-green-500 text-white' : 'bg-surface text-text-base border border-border'}"
								>
									{layoutMode ? '🪑 Exit Layout' : '🪑 Arrange Seats'}
								</button>
								<button
									onclick={() => {
										if (editMode) {
											editMode = false;
											layoutMode = false;
										} else {
											editMode = !editMode;
											layoutMode = false;
										}
									}}
									class="px-3 py-2 text-sm rounded-lg transition-colors {editMode ? 'bg-orange-500 text-white' : 'bg-surface text-text-base border border-border'}"
								>
									{editMode ? '✏️ Exit Edit' : '✏️ Edit Students'}
								</button>
								<button
									onclick={expandWorkspace}
									class="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-400 transition-colors"
								>
									🔍 Expand Workspace
								</button>
								<button
									onclick={randomizeSeating}
									class="px-3 py-2 bg-purple text-highlight text-sm rounded-lg hover:bg-purple-hover transition-colors"
								>
									🎲 Randomize
								</button>
								<button
									onclick={clearSeatingChart}
									class="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-400 transition-colors"
								>
									Clear All
								</button>
							</div>
						</div>

						<!-- Grid Settings -->
						<div class="flex items-center gap-4 mb-6 p-4 bg-surface rounded-lg">
							<div class="flex items-center gap-2">
								<label for="grid-rows" class="text-sm font-medium text-text-base">Rows:</label>
								<input
									id="grid-rows"
									type="number"
									min="10"
									max="40"
									bind:value={gridRows}
									onchange={() => resizeGrid(gridRows, gridCols)}
									class="w-16 px-2 py-1 bg-card border border-border rounded text-center text-sm"
								/>
							</div>
							<div class="flex items-center gap-2">
								<label for="grid-cols" class="text-sm font-medium text-text-base">Columns:</label>
								<input
									id="grid-cols"
									type="number"
									min="15"
									max="50"
									bind:value={gridCols}
									onchange={() => resizeGrid(gridRows, gridCols)}
									class="w-16 px-2 py-1 bg-card border border-border rounded text-center text-sm"
								/>
							</div>
						</div>

						<!-- Classroom Grid -->
						<div class="bg-surface p-4 rounded-lg overflow-auto max-h-[80vh] w-full">
							<div class="inline-block">
								<div 
									class="grid gap-3"
									style="grid-template-columns: repeat({gridCols}, 80px); grid-template-rows: repeat({gridRows}, 80px);"
								>
									{#each Array(gridRows) as _, row}
										{#each Array(gridCols) as _, col}
											<div
												class="relative"
												ondragover={handleDragOver}
												ondragleave={handleDragLeave}
												ondrop={(e) => handleDrop(e, row, col)}
												role="gridcell"
												aria-label={`Grid position row ${row + 1}, column ${col + 1}`}
											>
												{#if row === teacherDesk.row && col === teacherDesk.col}
													<!-- Teacher Desk -->
													<div 
														class="w-full h-full bg-yellow-100 border-2 border-yellow-400 rounded-lg flex items-center justify-center relative group transition-all duration-200 {editMode ? 'cursor-move hover:bg-yellow-200 hover:border-yellow-500' : ''}"
														draggable={editMode}
														ondragstart={editMode ? handleTeacherDeskDragStart : undefined}
														role="button"
														aria-label="Teacher desk{editMode ? ' - drag to move' : ''}"
														tabindex={editMode ? 0 : -1}
													>
														<svg class="w-8 h-8 text-yellow-700" fill="currentColor" viewBox="0 0 24 24">
															<path d="M12 2L13.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
														</svg>
														{#if editMode}
															<div class="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
																Drag
															</div>
														{/if}
													</div>
												{:else}
													<!-- Seat Area -->
													{@const hasSeat = seatLayout.has(`${row}-${col}`)}
													{#if hasSeat}
														<!-- Physical Seat -->
														<div 
															class="w-full h-full border-2 rounded-lg flex items-center justify-center relative group transition-all duration-200
																{layoutMode 
																	? 'border-green-400 bg-green-50 cursor-move hover:bg-green-100 hover:border-green-500' 
																	: 'border-gray-300 bg-gray-50 hover:border-purple/50'
																}"
															draggable={layoutMode}
															ondragstart={layoutMode ? (e) => handleSeatDragStart(e, row, col) : undefined}
															role="button"
															aria-label="Seat at row ${row + 1}, column ${col + 1}{layoutMode ? ' - drag to move' : ''}{seatingData[row] && seatingData[row][col] ? ' - occupied' : ' - empty'}"
															tabindex={layoutMode ? 0 : -1}
														>
															{#if seatingData[row] && seatingData[row][col]}
																{@const student = getStudentById(seatingData[row][col])}
																{#if student}
																	<div class="relative group">
																		<div 
																			class="w-16 h-16 bg-gradient-to-br from-purple to-purple-light rounded-full flex items-center justify-center text-highlight font-medium text-sm transition-all duration-200 {editMode && !layoutMode ? 'cursor-move hover:scale-110 hover:shadow-lg' : 'cursor-pointer'}"
																			draggable={editMode && !layoutMode}
																			ondragstart={editMode && !layoutMode ? (e) => handleDragStart(e, student.id) : undefined}
																			role="button"
																			aria-label="{student.name}{editMode && !layoutMode ? ' - drag to move' : ''}"
																			tabindex={editMode && !layoutMode ? 0 : -1}
																		>
																			{getStudentInitials(student)}
																		</div>
																		{#if !layoutMode}
																			<button
																				onclick={() => removeStudentFromSeat(row, col)}
																				class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
																				title="Remove student"
																				aria-label="Remove {student.name} from seat"
																			>
																				×
																			</button>
																		{/if}
																		<div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
																			{student.name}
																		</div>
																		{#if editMode && !layoutMode}
																			<div class="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
																				Drag
																			</div>
																		{/if}
																	</div>
																{/if}
															{:else}
																<!-- Empty seat -->
																<div class="w-12 h-12 border-2 border-gray-400 rounded bg-white flex items-center justify-center" aria-label="Empty seat">
																	<svg class="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
																		<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V6H1v11h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h12v2c0 .55.45 1 1 1s1-.45 1-1v-2h2V6h-2z"/>
																	</svg>
																</div>
															{/if}
															
															{#if layoutMode}
																<div class="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
																	Drag
																</div>
																<button
																	onclick={() => removeSeat(row, col)}
																	class="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
																	title="Remove seat"
																	aria-label="Remove seat at row ${row + 1}, column ${col + 1}"
																>
																	×
																</button>
															{/if}
														</div>
													{:else if layoutMode}
														<!-- Empty grid space in layout mode - click to add seat -->
														<button 
															class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 hover:border-green-400 hover:bg-green-50 transition-colors flex items-center justify-center cursor-pointer"
															onclick={() => addSeat(row, col)}
															aria-label="Add seat at row ${row + 1}, column ${col + 1}"
														>
															<div class="text-gray-400 text-sm text-center">
																<div class="text-3xl font-light">+</div>
																<div class="text-xs mt-1">Add Seat</div>
															</div>
														</button>
													{:else}
														<!-- Empty space in normal mode -->
														<div class="w-full h-full"></div>
													{/if}
												{/if}
											</div>
										{/each}
									{/each}
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Unassigned Students -->
					<div class="bg-card border border-border rounded-lg p-6">
						<h3 class="text-lg font-semibold text-highlight mb-4">
							Unassigned Students ({unassignedStudents.length})
						</h3>
						
						{#if unassignedStudents.length > 0}
							<div class="space-y-2 max-h-64 overflow-y-auto">
								{#each unassignedStudents as student (student.id)}
									<div
										draggable="true"
										ondragstart={(e) => handleDragStart(e, student.id)}
										class="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-accent transition-colors cursor-grab active:cursor-grabbing"
										role="button"
										aria-label="Drag {student.name} to assign to a seat"
										tabindex="0"
									>
										<div class="w-8 h-8 bg-gradient-to-br from-purple to-purple-light rounded-full flex items-center justify-center text-highlight font-medium text-sm">
											{getStudentInitials(student)}
										</div>
										<span class="text-text-base font-medium">{student.name}</span>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-center py-6">
								<svg class="w-12 h-12 text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
								</svg>
								<p class="text-muted text-sm">All students assigned!</p>
							</div>
						{/if}
					</div>

					<!-- Legend -->
					<div class="bg-card border border-border rounded-lg p-6">
						<h3 class="text-lg font-semibold text-highlight mb-4">Legend</h3>
						
						<div class="space-y-3 text-sm" role="list">
							<div class="flex items-center gap-3" role="listitem">
								<div class="w-6 h-6 bg-yellow-100 border-2 border-yellow-400 rounded flex items-center justify-center" aria-hidden="true">
									<svg class="w-3 h-3 text-yellow-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path d="M12 2L13.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
									</svg>
								</div>
								<span class="text-text-base">Teacher Desk</span>
							</div>
							<div class="flex items-center gap-3" role="listitem">
								<div class="w-6 h-6 bg-gradient-to-br from-purple to-purple-light rounded-full flex items-center justify-center text-highlight text-xs font-medium" aria-hidden="true">
									AB
								</div>
								<span class="text-text-base">Student Seat</span>
							</div>
							<div class="flex items-center gap-3" role="listitem">
								<div class="w-6 h-6 border-2 border-dashed border-border rounded bg-card flex items-center justify-center" aria-hidden="true">
									<div class="w-2 h-2 bg-muted rounded-full"></div>
								</div>
								<span class="text-text-base">Empty Seat</span>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-border">
							<p class="text-xs text-muted">💡 Drag students from the list to assign seats</p>
							{#if layoutMode}
								<p class="text-xs text-green-600 mt-1">🪑 Layout mode: Drag seats to rearrange room, click empty spaces to add seats</p>
							{:else if editMode}
								<p class="text-xs text-purple mt-1">✏️ Edit mode: Drag students and teacher desk to rearrange</p>
							{:else}
								<p class="text-xs text-muted mt-1">🪑 Click "Arrange Seats" to move physical seats around</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>