<!--
  @component
  PowerTeacher-style grade entry grid with all the advanced features
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Student, Assignment } from '$lib/types/gradebook';
  
  // Grade flags type
  type GradeFlags = Record<string, boolean>;
  
  // Grade entry type for this component
  interface GradeEntry {
    score: string | null;
    flags: GradeFlags;
    comment: string;
  }
  
  // Props
  let {
    students = [],
    assignment,
    onGradeChange,
    onFlagChange
  } = $props<{
    students: Student[];
    assignment: Assignment;
    onGradeChange?: (studentId: string, score: string | null, flags?: GradeFlags) => void;
    onFlagChange?: (studentId: string, flag: string, value: boolean) => void;
  }>();

  // State
  let showMetrics = $state(false);
  let selectedCell = $state<{ row: number; col: string } | null>(null);
  let grades = $state<Map<string, GradeEntry>>(new Map());
  let editingCell = $state<string | null>(null);
  let editValue = $state('');
  let focusedInput = $state<HTMLInputElement | undefined>();

  // Assignment flags
  const FLAGS = {
    missing: { icon: 'M', color: 'text-red-500', label: 'Missing' },
    late: { icon: 'L', color: 'text-orange-500', label: 'Late' },
    incomplete: { icon: 'I', color: 'text-yellow-500', label: 'Incomplete' },
    absent: { icon: 'A', color: 'text-gray-500', label: 'Absent' },
    exempt: { icon: 'E', color: 'text-purple-500', label: 'Exempt' },
    collected: { icon: 'C', color: 'text-green-500', label: 'Collected' }
  };

  // Column summary calculations
  let summary = $derived(() => {
    const scores = Array.from(grades.values())
      .map(g => g.score)
      .filter(s => s !== null && s !== undefined && s !== '');
    
    if (scores.length === 0) return {
      average: '--',
      median: '--',
      submitted: 0,
      missing: 0
    };

    const numScores = scores.map(s => parseFloat(s)).filter(n => !isNaN(n));
    const average = numScores.reduce((a, b) => a + b, 0) / numScores.length;
    const sorted = [...numScores].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      average: average.toFixed(1),
      median: median.toFixed(1),
      submitted: scores.length,
      missing: students.length - scores.length
    };
  });

  // Initialize grades
  onMount(() => {
    students.forEach(student => {
      // Load existing grades if any
      grades.set(student.id, {
        score: null,
        flags: {
          missing: false,
          late: false,
          incomplete: false,
          absent: false,
          exempt: false,
          collected: false
        },
        comment: ''
      });
    });
  });
  
  // Focus input when editing starts
  $effect(() => {
    if (editingCell && focusedInput) {
      focusedInput.focus();
    }
  });

  // Keyboard navigation
  function handleKeyDown(event: KeyboardEvent, rowIndex: number, colId: string) {
    const key = event.key;
    
    switch (key) {
      case 'Enter':
        if (editingCell === `${rowIndex}-${colId}`) {
          saveEdit(students[rowIndex].id);
        } else {
          startEdit(rowIndex, colId, students[rowIndex].id);
        }
        break;
      case 'Escape':
        cancelEdit();
        break;
      case 'ArrowUp':
        if (rowIndex > 0 && !editingCell) {
          event.preventDefault();
          selectedCell = { row: rowIndex - 1, col: colId };
          focusCell(rowIndex - 1, colId);
        }
        break;
      case 'ArrowDown':
        if (rowIndex < students.length - 1 && !editingCell) {
          event.preventDefault();
          selectedCell = { row: rowIndex + 1, col: colId };
          focusCell(rowIndex + 1, colId);
        }
        break;
      case 'Tab':
        if (editingCell) {
          event.preventDefault();
          saveEdit(students[rowIndex].id);
          if (rowIndex < students.length - 1) {
            setTimeout(() => {
              selectedCell = { row: rowIndex + 1, col: colId };
              focusCell(rowIndex + 1, colId);
              startEdit(rowIndex + 1, colId, students[rowIndex + 1].id);
            }, 50);
          }
        }
        break;
    }

    // Quick flag shortcuts (when not editing)
    if (!editingCell) {
      switch (key.toLowerCase()) {
        case 'm':
          toggleFlag(students[rowIndex].id, 'missing');
          break;
        case 'l':
          toggleFlag(students[rowIndex].id, 'late');
          break;
        case 'a':
          toggleFlag(students[rowIndex].id, 'absent');
          break;
        case 'e':
          toggleFlag(students[rowIndex].id, 'exempt');
          break;
      }
    }
  }

  function startEdit(rowIndex: number, colId: string, studentId: string) {
    const grade = grades.get(studentId);
    editingCell = `${rowIndex}-${colId}`;
    editValue = grade?.score || '';
    selectedCell = { row: rowIndex, col: colId };
  }

  function saveEdit(studentId: string) {
    const grade = grades.get(studentId) || {};
    grade.score = editValue;
    grades.set(studentId, grade);
    
    if (onGradeChange) {
      onGradeChange(studentId, editValue, grade.flags);
    }
    
    editingCell = null;
    editValue = '';
  }

  function cancelEdit() {
    editingCell = null;
    editValue = '';
  }

  function toggleFlag(studentId: string, flag: string) {
    const grade = grades.get(studentId) || {};
    if (!grade.flags) grade.flags = {};
    grade.flags[flag] = !grade.flags[flag];
    grades.set(studentId, grade);
    
    if (onFlagChange) {
      onFlagChange(studentId, flag, grade.flags[flag]);
    }
  }

  function focusCell(row: number, col: string) {
    const cell = document.querySelector(`[data-cell="${row}-${col}"]`) as HTMLElement;
    cell?.focus();
  }

  // Auto-fill functions
  function autoFillDown(startRow: number) {
    const startGrade = grades.get(students[startRow].id);
    if (!startGrade?.score) return;
    
    for (let i = startRow + 1; i < students.length; i++) {
      const grade = grades.get(students[i].id) || {};
      grade.score = startGrade.score;
      grades.set(students[i].id, grade);
    }
  }

  function fillAll(value: string) {
    students.forEach(student => {
      const grade = grades.get(student.id) || {};
      grade.score = value;
      grades.set(student.id, grade);
    });
  }
</script>

<div class="power-teacher-grade-entry">
  <!-- Column Summary Bar -->
  <div class="column-summary-bar bg-gray-50 dark:bg-gray-800 p-4 border-b sticky top-0 z-20">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-6">
        <div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Assignment:</span>
          <span class="font-semibold ml-2">{assignment?.name || 'Untitled'}</span>
        </div>
        <div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Score Type:</span>
          <span class="font-semibold ml-2 capitalize">{assignment?.scoreType || 'points'}</span>
        </div>
        <div>
          <span class="text-sm text-gray-600 dark:text-gray-400">Due:</span>
          <span class="font-semibold ml-2">{assignment?.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</span>
        </div>
      </div>
      
      <button
        onclick={() => showMetrics = !showMetrics}
        class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
      >
        {showMetrics ? 'Hide' : 'Show'} Metrics
      </button>
    </div>
    
    {#if showMetrics}
      <div class="mt-3 pt-3 border-t grid grid-cols-4 gap-4">
        <div>
          <span class="text-xs text-gray-500 dark:text-gray-400">Average</span>
          <div class="text-lg font-bold">{summary.average}</div>
        </div>
        <div>
          <span class="text-xs text-gray-500 dark:text-gray-400">Median</span>
          <div class="text-lg font-bold">{summary.median}</div>
        </div>
        <div>
          <span class="text-xs text-gray-500 dark:text-gray-400">Submitted</span>
          <div class="text-lg font-bold text-green-600">{summary.submitted}</div>
        </div>
        <div>
          <span class="text-xs text-gray-500 dark:text-gray-400">Missing</span>
          <div class="text-lg font-bold text-red-600">{summary.missing}</div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Special Functions Menu -->
  <div class="p-2 bg-gray-100 dark:bg-gray-900 flex justify-between items-center">
    <div class="text-sm text-gray-600 dark:text-gray-400">
      Students ({students.length})
    </div>
    
    <div class="relative group">
      <button class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" aria-label="Show special functions menu">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      
      <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg hidden group-hover:block">
        <button
          onclick={() => fillAll('100')}
          class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Fill All - 100
        </button>
        <button
          onclick={() => fillAll('0')}
          class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Fill All - 0
        </button>
        <button
          onclick={() => students.forEach(s => toggleFlag(s.id, 'missing'))}
          class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Mark All Missing
        </button>
        <button
          onclick={() => students.forEach(s => toggleFlag(s.id, 'collected'))}
          class="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Mark All Collected
        </button>
      </div>
    </div>
  </div>

  <!-- Grade Entry Grid -->
  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead class="sticky top-[120px] z-10 bg-white dark:bg-gray-900">
        <tr>
          <th class="text-left p-3 border-b-2 border-gray-300 dark:border-gray-600 w-64">
            Student
          </th>
          <th class="text-center p-3 border-b-2 border-gray-300 dark:border-gray-600 w-32">
            Score
          </th>
          <th class="text-center p-3 border-b-2 border-gray-300 dark:border-gray-600">
            Flags
          </th>
        </tr>
      </thead>
      <tbody>
        {#each students as student, index (student.id)}
          {@const grade = grades.get(student.id)}
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="p-3 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-3">
                <span class="text-gray-500 text-sm w-6">{index + 1}.</span>
                <a 
                  href="/students/{student.id}"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {student.lastName}, {student.firstName}
                </a>
              </div>
            </td>
            <td class="p-3 border-b border-gray-200 dark:border-gray-700">
              <div
                data-cell="{index}-score"
                tabindex="0"
                role="button"
                class="text-center cursor-pointer p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                onkeydown={(e) => handleKeyDown(e, index, 'score')}
                onclick={() => startEdit(index, 'score', student.id)}
              >
                {#if editingCell === `${index}-score`}
                  <input
                    type="text"
                    bind:value={editValue}
                    onblur={() => saveEdit(student.id)}
                    class="w-full text-center bg-transparent border-b-2 border-blue-500 outline-none"
                    bind:this={focusedInput}
                  />
                {:else}
                  <span class="font-semibold">
                    {grade?.score || '--'}
                  </span>
                {/if}
              </div>
            </td>
            <td class="p-3 border-b border-gray-200 dark:border-gray-700">
              <div class="flex justify-center gap-2">
                {#each Object.entries(FLAGS) as [flag, config] (flag)}
                  <button
                    onclick={() => toggleFlag(student.id, flag)}
                    class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors {
                      grade?.flags?.[flag] 
                        ? `${config.color} bg-gray-100 dark:bg-gray-800` 
                        : 'text-gray-300 hover:text-gray-500'
                    }"
                    title={config.label}
                  >
                    {config.icon}
                  </button>
                {/each}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style lang="postcss">
  .power-teacher-grade-entry {
    @apply bg-white dark:bg-gray-900 rounded-lg shadow-sm;
  }
  
  /* Sticky positioning adjustments */
  :global(.power-teacher-grade-entry thead) {
    position: sticky;
    top: 0;
  }
</style>