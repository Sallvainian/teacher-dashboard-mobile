// src/lib/stores/jeopardy/templates.ts
// Game templates functionality

import { get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';
import { games } from './core';
import { saveGameToSupabase } from './database';
import type { GameTemplate, Category } from '$lib/types/jeopardy';

// Game Templates
export function getGameTemplates(): GameTemplate[] {
	return [
		{
			id: 'science',
			name: 'Science Trivia',
			description: 'A collection of science questions across various topics',
			categories: [
				{
					name: 'Biology',
					questions: [
						{
							text: 'What is the largest organ in the human body?',
							answer: 'Skin',
							pointValue: 100
						},
						{
							text: 'How many chambers does a human heart have?',
							answer: 'Four',
							pointValue: 200
						},
						{
							text: 'What is the process by which plants make their own food?',
							answer: 'Photosynthesis',
							pointValue: 300
						},
						{
							text: 'What is the powerhouse of the cell?',
							answer: 'Mitochondria',
							pointValue: 400
						},
						{
							text: 'What type of blood cells carry oxygen?',
							answer: 'Red blood cells',
							pointValue: 500
						}
					]
				},
				{
					name: 'Chemistry',
					questions: [
						{ text: 'What is the chemical symbol for gold?', answer: 'Au', pointValue: 100 },
						{
							text: 'What is the most abundant element in the universe?',
							answer: 'Hydrogen',
							pointValue: 200
						},
						{ text: 'What is the pH of pure water?', answer: '7', pointValue: 300 },
						{
							text: 'What are the three states of matter?',
							answer: 'Solid, liquid, gas',
							pointValue: 400
						},
						{ text: 'What is the chemical formula for water?', answer: 'H2O', pointValue: 500 }
					]
				}
			]
		},
		{
			id: 'history',
			name: 'World History',
			description: 'Historical events and figures from around the world',
			categories: [
				{
					name: 'Ancient History',
					questions: [
						{
							text: 'Which ancient wonder of the world still stands today?',
							answer: 'Great Pyramid of Giza',
							pointValue: 100
						},
						{ text: 'Who was the first emperor of Rome?', answer: 'Augustus', pointValue: 200 },
						{ text: 'What year did the Roman Empire fall?', answer: '476 AD', pointValue: 300 },
						{ text: 'Which civilization built Machu Picchu?', answer: 'Inca', pointValue: 400 },
						{ text: 'Who wrote "The Art of War"?', answer: 'Sun Tzu', pointValue: 500 }
					]
				}
			]
		}
	];
}

export function applyGameTemplate(gameId: string, templateId: string): void {
	const template = getGameTemplates().find((t) => t.id === templateId);
	if (!template) return;

	const categories: Category[] = template.categories.map((cat) => ({
		id: uuidv4(),
		name: cat.name,
		questions: cat.questions.map((q) => ({
			id: uuidv4(),
			...q,
			isDoubleJeopardy: false,
			isAnswered: false
		}))
	}));

	games.update((allGames) =>
		allGames.map((game) =>
			game.id === gameId ? { ...game, categories, lastModified: new Date().toISOString() } : game
		)
	);

	// Save to Supabase asynchronously
	const game = get(games).find((g) => g.id === gameId);
	if (game) {
		saveGameToSupabase(game).catch((_err) => {
			console.error('Error saving game after applying template');
		});
	}
}