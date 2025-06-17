<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	// Game state
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let gameRunning = $state(false);
	let score = $state(0);
	let highScore = $state(parseInt(localStorage.getItem('snake-high-score') || '0'));
	let gameOver = $state(false);
	let paused = $state(false);
	let showNameInput = $state(false);
	let playerName = $state('');

	// Leaderboard types
	interface LeaderboardEntry {
		name: string;
		score: number;
		date: string;
	}

	let leaderboard = $state<LeaderboardEntry[]>([]);

	// Game settings
	const GRID_SIZE = 20;
	const CANVAS_WIDTH = 600;
	const CANVAS_HEIGHT = 400;
	const GAME_SPEED = 150; // milliseconds between moves

	// Snake and food
	let snake = $state([{ x: 10, y: 10 }]);
	let food = $state({ x: 15, y: 15 });
	let direction = $state({ x: 1, y: 0 });
	let nextDirection = $state({ x: 1, y: 0 });

	let gameInterval: NodeJS.Timeout;

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d')!;
			canvas.width = CANVAS_WIDTH;
			canvas.height = CANVAS_HEIGHT;
			
			// Add keyboard listeners
			window.addEventListener('keydown', handleKeyPress);
			
			// Initial draw
			draw();
		}
		
		// Load leaderboard
		loadLeaderboard();
	});

	onDestroy(() => {
		if (gameInterval) clearInterval(gameInterval);
		window.removeEventListener('keydown', handleKeyPress);
	});

	function handleKeyPress(e: KeyboardEvent) {
		// Don't handle game controls when name input is showing
		if (showNameInput) return;
		
		if (!gameRunning || paused) return;

		switch (e.key) {
			case 'ArrowUp':
				if (direction.y === 0) nextDirection = { x: 0, y: -1 };
				e.preventDefault();
				break;
			case 'ArrowDown':
				if (direction.y === 0) nextDirection = { x: 0, y: 1 };
				e.preventDefault();
				break;
			case 'ArrowLeft':
				if (direction.x === 0) nextDirection = { x: -1, y: 0 };
				e.preventDefault();
				break;
			case 'ArrowRight':
				if (direction.x === 0) nextDirection = { x: 1, y: 0 };
				e.preventDefault();
				break;
			case ' ':
				togglePause();
				e.preventDefault();
				break;
		}
	}

	function startGame() {
		snake = [{ x: 10, y: 10 }];
		direction = { x: 1, y: 0 };
		nextDirection = { x: 1, y: 0 };
		score = 0;
		gameOver = false;
		paused = false;
		gameRunning = true;
		
		generateFood();
		
		if (gameInterval) clearInterval(gameInterval);
		gameInterval = setInterval(gameLoop, GAME_SPEED);
	}

	function stopGame() {
		gameRunning = false;
		gameOver = true;
		paused = false;
		
		if (gameInterval) clearInterval(gameInterval);
		
		// Update high score
		if (score > highScore) {
			highScore = score;
			localStorage.setItem('snake-high-score', highScore.toString());
		}
		
		// Check if score qualifies for leaderboard (top 10)
		if (isLeaderboardScore(score)) {
			showNameInput = true;
		}
	}

	function togglePause() {
		if (!gameRunning) return;
		
		paused = !paused;
		
		if (paused) {
			if (gameInterval) clearInterval(gameInterval);
		} else {
			gameInterval = setInterval(gameLoop, GAME_SPEED);
		}
	}

	function gameLoop() {
		if (paused) return;
		
		// Update direction
		direction = { ...nextDirection };
		
		// Move snake
		const head = { ...snake[0] };
		head.x += direction.x;
		head.y += direction.y;
		
		// Check wall collision
		if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || 
			head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
			stopGame();
			return;
		}
		
		// Check self collision
		if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
			stopGame();
			return;
		}
		
		snake = [head, ...snake];
		
		// Check food collision
		if (head.x === food.x && head.y === food.y) {
			score += 10;
			generateFood();
		} else {
			snake.pop();
		}
		
		draw();
	}

	function generateFood() {
		let newFood: { x: number; y: number };
		do {
			newFood = {
				x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
				y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE))
			};
		} while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
		
		food = newFood;
	}

	function draw() {
		if (!ctx) return;
		
		// Clear canvas
		ctx.fillStyle = '#1a1a1a';
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		// Draw grid
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 1;
		for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, CANVAS_HEIGHT);
			ctx.stroke();
		}
		for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(CANVAS_WIDTH, y);
			ctx.stroke();
		}
		
		// Draw snake
		ctx.fillStyle = '#4ade80';
		snake.forEach((segment, index) => {
			if (index === 0) {
				// Head - brighter green
				ctx.fillStyle = '#22c55e';
			} else {
				ctx.fillStyle = '#4ade80';
			}
			ctx.fillRect(
				segment.x * GRID_SIZE + 1,
				segment.y * GRID_SIZE + 1,
				GRID_SIZE - 2,
				GRID_SIZE - 2
			);
		});
		
		// Draw food
		ctx.fillStyle = '#ef4444';
		ctx.fillRect(
			food.x * GRID_SIZE + 1,
			food.y * GRID_SIZE + 1,
			GRID_SIZE - 2,
			GRID_SIZE - 2
		);
	}

	// Leaderboard functions
	function loadLeaderboard() {
		try {
			const stored = localStorage.getItem('snake-leaderboard');
			if (stored) {
				leaderboard = JSON.parse(stored);
			}
		} catch (error) {
			console.error('Error loading leaderboard:', error);
			leaderboard = [];
		}
	}

	function saveLeaderboard() {
		try {
			localStorage.setItem('snake-leaderboard', JSON.stringify(leaderboard));
		} catch (error) {
			console.error('Error saving leaderboard:', error);
		}
	}

	function isLeaderboardScore(newScore: number): boolean {
		if (newScore === 0) return false;
		if (leaderboard.length < 10) return true;
		return newScore > leaderboard[leaderboard.length - 1].score;
	}

	function addToLeaderboard(name: string, score: number) {
		const entry: LeaderboardEntry = {
			name: name.trim() || 'Anonymous',
			score,
			date: new Date().toLocaleDateString()
		};

		leaderboard.push(entry);
		leaderboard.sort((a, b) => b.score - a.score);
		leaderboard = leaderboard.slice(0, 10); // Keep only top 10
		saveLeaderboard();
	}

	function submitScore() {
		if (playerName.trim().length === 0) {
			playerName = 'Anonymous';
		}
		addToLeaderboard(playerName, score);
		showNameInput = false;
		playerName = '';
	}

	function skipLeaderboard() {
		showNameInput = false;
		playerName = '';
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
					<h1 class="text-3xl font-bold text-highlight">Snake Game</h1>
					<p class="text-text-base">Use arrow keys to control the snake</p>
				</div>
			</div>
			
			<div class="flex items-center gap-4">
				<div class="text-center">
					<div class="text-2xl font-bold text-highlight">{score}</div>
					<div class="text-sm text-muted">Score</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-purple">{highScore}</div>
					<div class="text-sm text-muted">High Score</div>
				</div>
			</div>
		</div>

		<!-- Game Area -->
		<div class="flex flex-col lg:flex-row gap-8 items-start">
			<!-- Game Canvas -->
			<div class="flex-1">
				<div class="bg-card border border-border rounded-lg p-6">
					<div class="relative">
						<canvas
							bind:this={canvas}
							class="border border-border rounded-lg bg-black mx-auto block"
							style="max-width: 100%; height: auto;"
						></canvas>
						
						{#if !gameRunning && !gameOver}
							<div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
								<div class="text-center text-white">
									<h3 class="text-2xl font-bold mb-4">Snake Game</h3>
									<p class="mb-4">Use arrow keys to move, space to pause</p>
									<button
										onclick={startGame}
										class="px-6 py-3 bg-purple text-highlight rounded-lg hover:bg-purple-hover transition-colors font-medium"
									>
										Start Game
									</button>
								</div>
							</div>
						{/if}
						
						{#if paused}
							<div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
								<div class="text-center text-white">
									<h3 class="text-2xl font-bold mb-4">Paused</h3>
									<button
										onclick={togglePause}
										class="px-6 py-3 bg-purple text-highlight rounded-lg hover:bg-purple-hover transition-colors font-medium"
									>
										Resume
									</button>
								</div>
							</div>
						{/if}
						
						{#if gameOver}
							<div class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
								<div class="text-center text-white">
									<h3 class="text-2xl font-bold mb-2">Game Over!</h3>
									<p class="text-lg mb-4">Score: {score}</p>
									{#if score === highScore && score > 0}
										<p class="text-yellow-400 mb-4">🎉 New High Score!</p>
									{/if}
									<button
										onclick={startGame}
										class="px-6 py-3 bg-purple text-highlight rounded-lg hover:bg-purple-hover transition-colors font-medium"
									>
										Play Again
									</button>
								</div>
							</div>
						{/if}

						{#if showNameInput}
							<div class="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg z-10">
								<div class="bg-card border border-border rounded-lg p-6 text-center max-w-sm mx-4">
									<h3 class="text-xl font-bold text-highlight mb-2">🎉 Great Score!</h3>
									<p class="text-text-base mb-4">You made it to the leaderboard!</p>
									<p class="text-lg font-semibold text-purple mb-4">Score: {score}</p>
									
									<div class="mb-4">
										<label for="playerName" class="block text-sm font-medium text-text-base mb-2">
											Enter your name:
										</label>
										<input
											id="playerName"
											bind:value={playerName}
											placeholder="Your name"
											maxlength="20"
											class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-base focus:border-purple focus:outline-none"
											onkeydown={(e) => e.key === 'Enter' && submitScore()}
										/>
									</div>
									
									<div class="flex gap-3">
										<button
											onclick={submitScore}
											class="flex-1 px-4 py-2 bg-purple text-highlight rounded-lg hover:bg-purple-hover transition-colors font-medium"
										>
											Submit
										</button>
										<button
											onclick={skipLeaderboard}
											class="flex-1 px-4 py-2 bg-surface text-text-base border border-border rounded-lg hover:bg-accent transition-colors"
										>
											Skip
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Game Info & Controls -->
			<div class="w-full lg:w-80 space-y-6">
				<!-- How to Play Card -->
				<div class="bg-card border border-border rounded-lg p-6">
					<h3 class="text-lg font-semibold text-highlight mb-4">How to Play</h3>
					
					<div class="space-y-4 text-sm text-text-base">
						<div>
							<h4 class="font-medium text-highlight mb-2">Controls:</h4>
							<ul class="space-y-1 text-muted">
								<li>• Arrow Keys - Move snake</li>
								<li>• Spacebar - Pause/Resume</li>
							</ul>
						</div>
						
						<div>
							<h4 class="font-medium text-highlight mb-2">Rules:</h4>
							<ul class="space-y-1 text-muted">
								<li>• Eat red food to grow and score</li>
								<li>• Don't hit walls or yourself</li>
								<li>• Snake gets longer each time you eat</li>
								<li>• Score increases by 10 per food</li>
							</ul>
						</div>
						
						<div>
							<h4 class="font-medium text-highlight mb-2">Tips:</h4>
							<ul class="space-y-1 text-muted">
								<li>• Plan your path ahead</li>
								<li>• Use the walls strategically</li>
								<li>• Don't get trapped by your tail</li>
							</ul>
						</div>
					</div>
					
					{#if gameRunning}
						<div class="mt-6 space-y-2">
							<button
								onclick={togglePause}
								class="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-medium"
							>
								{paused ? 'Resume' : 'Pause'}
							</button>
							<button
								onclick={stopGame}
								class="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition-colors font-medium"
							>
								End Game
							</button>
						</div>
					{/if}
				</div>

				<!-- Leaderboard Card -->
				<div class="bg-card border border-border rounded-lg p-6">
					<div class="flex items-center gap-2 mb-4">
						<svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
						</svg>
						<h3 class="text-lg font-semibold text-highlight">Leaderboard</h3>
					</div>
					
					{#if leaderboard.length > 0}
						<div class="space-y-2">
							{#each leaderboard as entry, index (entry.name + entry.score + entry.date)}
								<div class="flex items-center justify-between p-2 rounded-lg bg-surface">
									<div class="flex items-center gap-3">
										<div class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
											{index === 0 ? 'bg-yellow-500 text-black' : 
											 index === 1 ? 'bg-gray-400 text-black' : 
											 index === 2 ? 'bg-amber-600 text-white' : 
											 'bg-purple text-highlight'}">
											{index + 1}
										</div>
										<div>
											<div class="font-medium text-text-base text-sm">{entry.name}</div>
											<div class="text-xs text-muted">{entry.date}</div>
										</div>
									</div>
									<div class="font-bold text-purple">{entry.score}</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="text-center py-6">
							<svg class="w-12 h-12 text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
							</svg>
							<p class="text-muted text-sm">No scores yet!</p>
							<p class="text-muted text-xs mt-1">Be the first to score points</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>