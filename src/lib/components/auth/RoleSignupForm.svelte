<script lang="ts">
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import type { StudentSignupData, TeacherSignupData } from '$lib/types/auth';
	import type { UserRole } from '$lib/types/database';

	let step: 'role' | 'details' = $state('role');
	let selectedRole: UserRole | null = $state(null);

	// Form fields
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let fullName = $state('');
	let joinCode = $state('');
	let schoolName = $state('');

	let isLoading = $state(false);
	let error = $state('');

	function selectRole(role: UserRole) {
		selectedRole = role;
		step = 'details';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		// Validate password match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		// Validate required fields
		if (!email || !password || !fullName) {
			error = 'Please fill in all required fields';
			return;
		}

		isLoading = true;

		try {
			let result: boolean | { needsEmailConfirmation: boolean } = false;

			if (selectedRole === 'student') {
				const data: StudentSignupData = {
					email,
					password,
					fullName,
					joinCode: joinCode || undefined
				};
				result = await authStore.signUpStudent(data);
			} else if (selectedRole === 'teacher') {
				const data: TeacherSignupData = {
					email,
					password,
					fullName,
					schoolName: schoolName || undefined
				};
				result = await authStore.signUpTeacher(data);
			}

			if (result === true || (typeof result === 'object' && result.needsEmailConfirmation)) {
				// Check if email verification is required
				error = 'Please check your email to verify your account';
				setTimeout(() => {
					goto('/auth/login');
				}, 3000);
			} else {
				// Get error from store
				const { error: authError } = $authStore;
				error = authError || 'Signup failed';
			}
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Signup failed';
		} finally {
			isLoading = false;
		}
	}

	function goBack() {
		step = 'role';
		selectedRole = null;
	}
</script>

<div class="bg-card rounded-lg shadow-card p-8">
		<div class="text-center mb-6">
			<h2 class="text-2xl font-bold text-highlight">
				Create your account
			</h2>
			<p class="mt-2 text-sm text-muted">Choose your role to get started</p>
		</div>

		{#if step === 'role'}
			<div class="space-y-4">
				<button
					onclick={() => selectRole('teacher')}
					class="w-full flex flex-col items-center px-6 py-4 border border-border rounded-lg hover:bg-surface transition-colors"
				>
					<svg
						class="w-12 h-12 text-purple mb-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-highlight">I'm a Teacher</h3>
					<p class="text-sm text-muted text-center mt-1">
						Create and manage classes, track student progress, and create educational games
					</p>
				</button>

				<button
					onclick={() => selectRole('student')}
					class="w-full flex flex-col items-center px-6 py-4 border border-border rounded-lg hover:bg-surface transition-colors"
				>
					<svg
						class="w-12 h-12 text-purple mb-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-highlight">I'm a Student</h3>
					<p class="text-sm text-muted text-center mt-1">
						Join classes, view your progress, and create your own Jeopardy games
					</p>
				</button>
			</div>
		{:else if step === 'details'}
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-4">
					<div>
						<label for="full-name" class="block text-sm font-medium text-text-base mb-1">Full name</label>
						<input
							id="full-name"
							type="text"
							bind:value={fullName}
							required
							class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
							placeholder="Enter your full name"
						/>
					</div>
					<div>
						<label for="email-address" class="block text-sm font-medium text-text-base mb-1">Email address</label>
						<input
							id="email-address"
							type="email"
							bind:value={email}
							autocomplete="email"
							required
							class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
							placeholder="Enter your email"
						/>
					</div>
					<div>
						<label for="password" class="block text-sm font-medium text-text-base mb-1">Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							autocomplete="new-password"
							required
							class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
							placeholder="Create a password"
						/>
					</div>
					<div>
						<label for="confirm-password" class="block text-sm font-medium text-text-base mb-1">Confirm Password</label>
						<input
							id="confirm-password"
							type="password"
							bind:value={confirmPassword}
							autocomplete="new-password"
							required
							class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
							placeholder="Confirm your password"
						/>
					</div>

					{#if selectedRole === 'student'}
						<div>
							<label for="join-code" class="block text-sm font-medium text-text-base mb-1">Class join code (optional)</label>
							<input
								id="join-code"
								type="text"
								bind:value={joinCode}
								class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
								placeholder="Enter class join code"
							/>
						</div>
					{:else if selectedRole === 'teacher'}
						<div>
							<label for="school-name" class="block text-sm font-medium text-text-base mb-1">School name (optional)</label>
							<input
								id="school-name"
								type="text"
								bind:value={schoolName}
								class="w-full px-3 py-2 border border-border bg-surface text-text-base rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:border-purple"
								placeholder="Enter your school name"
							/>
						</div>
					{/if}
				</div>

				{#if error}
					<div class="rounded-md bg-error/10 border border-error/20 p-4">
						<div class="flex">
							<div class="ml-3">
								<h3 class="text-sm font-medium text-error">
									{error}
								</h3>
							</div>
						</div>
					</div>
				{/if}

				<div class="flex gap-4">
					<button
						type="button"
						onclick={goBack}
						class="flex-1 flex justify-center py-2 px-4 border border-border rounded-md text-sm font-medium text-text-base bg-surface hover:bg-accent focus:outline-none focus:ring-2 focus:ring-purple"
					>
						Back
					</button>
					<button
						type="submit"
						disabled={isLoading}
						class="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-highlight bg-purple hover:bg-purple-hover focus:outline-none focus:ring-2 focus:ring-purple disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Creating account...' : 'Sign up'}
					</button>
				</div>
			</form>
		{/if}

		<div class="text-center mt-6">
			<span class="text-sm text-muted">
				Already have an account?
				<a href="/auth/login" class="font-medium text-purple hover:text-purple-hover">
					Sign in
				</a>
			</span>
		</div>
</div>
