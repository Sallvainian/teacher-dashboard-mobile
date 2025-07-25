<script lang="ts">
	import { authStore, user, profile } from '$lib/stores/auth/index';
	import { supabase } from '$lib/supabaseClient';
	import type { User } from '@supabase/supabase-js';
	import { getEventTargetFiles } from '$lib/utils/domHelpers';

	let fullName = $state(($user as User | null)?.user_metadata?.full_name || '');
	let avatarUrl = $state($profile?.avatar_url || '');
	let loading = $state(false);
	let uploadingAvatar = $state(false);
	let error = $state('');
	let success = $state(false);
	let avatarPreview = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	// Keep avatarUrl and fullName in sync with user/profile store changes
	$effect(() => {
		if ($user) {
			fullName = $user.user_metadata?.full_name || '';
		}
		if ($profile) {
			// Only update avatarUrl if we don't have a preview (i.e., user hasn't uploaded a new image)
			if (!avatarPreview) {
				avatarUrl = $profile.avatar_url || '';
			}
		}
	});

	function getInitials(name: string): string {
		if (!name) return 'U';
		return name
			.split(' ')
			.map(word => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	async function handleAvatarUpload(event: Event) {
		const files = getEventTargetFiles(event);
		const file = files?.[0];
		
		if (!file) return;

		// Validate file
		if (!file.type.startsWith('image/')) {
			error = 'Please select an image file';
			return;
		}

		if (file.size > 5 * 1024 * 1024) { // 5MB limit
			error = 'Image file must be less than 5MB';
			return;
		}

		uploadingAvatar = true;
		error = '';

		try {
			const fileExt = file.name.split('.').pop();
			const userId = ($user as User | null)?.id;
			if (!userId) throw new Error('User not authenticated');

			const fileName = `${userId}-${Date.now()}.${fileExt}`;
			const filePath = `${userId}/${fileName}`;

			// Upload to dedicated avatars bucket (public)
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, file, {
					cacheControl: '3600',
					upsert: true
				});

			if (uploadError) throw uploadError;

			// Get public URL from public avatars bucket
			const { data: { publicUrl } } = supabase.storage
				.from('avatars')
				.getPublicUrl(filePath);

			avatarUrl = publicUrl;
			
			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);

		} catch (err: unknown) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to upload avatar';
			}
		} finally {
			uploadingAvatar = false;
		}
	}

	async function removeAvatar() {
		avatarUrl = '';
		avatarPreview = null;
		if (fileInput) {
			fileInput.value = '';
		}
		await handleSubmit();
	}

	async function handleSubmit() {
		if (!fullName) {
			error = 'Please enter your name';
			return;
		}

		loading = true;
		error = '';
		success = false;

		try {
			const result = await authStore.updateUserProfile({
				full_name: fullName,
				avatar_url: avatarUrl || null
			});
			
			if (result) {
				success = true;
			} else {
				error = 'Failed to update profile';
			}
		} catch (err: unknown) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to update profile';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="w-full max-w-md">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="bg-card border border-border rounded-lg px-8 pt-6 pb-8 mb-4"
	>
		<h2 class="text-2xl font-bold mb-6 text-center text-highlight">Profile</h2>

		{#if error}
			<div class="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4" role="alert">
				<p>{error}</p>
			</div>
		{/if}

		{#if success}
			<div class="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-4" role="alert">
				<p>Profile updated successfully!</p>
			</div>
		{/if}

		<!-- Profile Picture Section -->
		<div class="mb-6">
			<label for="avatarUpload" class="block text-sm font-medium mb-3 text-text-base">Profile Picture</label>
			<div class="flex items-center gap-4">
				<!-- Avatar Display -->
				<div class="relative">
					{#if avatarPreview || avatarUrl}
						<img
							src={avatarPreview || avatarUrl}
							alt="Profile"
							class="w-20 h-20 rounded-full object-cover border-2 border-border"
						/>
					{:else}
						<div class="w-20 h-20 rounded-full bg-purple text-highlight flex items-center justify-center text-xl font-semibold border-2 border-border">
							{getInitials(fullName || ($user as User | null)?.email || '')}
						</div>
					{/if}
					
					{#if uploadingAvatar}
						<div class="absolute inset-0 bg-bg-base/80 rounded-full flex items-center justify-center">
							<svg class="animate-spin h-5 w-5 text-purple" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
					{/if}
				</div>

				<!-- Upload Controls -->
				<div class="flex-1">
					<input
						bind:this={fileInput}
						type="file"
						accept="image/*"
						onchange={handleAvatarUpload}
						class="hidden"
						id="avatarUpload"
					/>
					<div class="flex flex-col gap-2">
						<button
							type="button"
							onclick={() => fileInput.click()}
							disabled={uploadingAvatar}
							class="px-4 py-2 bg-transparent border border-border text-text-base rounded-lg hover:bg-surface transition-colors text-sm"
						>
							{uploadingAvatar ? 'Uploading...' : 'Choose Photo'}
						</button>
						{#if avatarUrl || avatarPreview}
							<button
								type="button"
								onclick={removeAvatar}
								disabled={uploadingAvatar}
								class="px-4 py-2 bg-transparent text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
							>
								Remove
							</button>
						{/if}
					</div>
				</div>
			</div>
			<p class="text-sm text-muted mt-2">Supported formats: JPG, PNG, GIF. Max size: 5MB</p>
		</div>

		<div class="mb-4">
			<label class="block text-sm font-medium mb-2 text-text-base" for="email"> Email </label>
			<input
				value={($user as User | null)?.email || ''}
				class="w-full px-4 py-3 bg-surface border border-border rounded-lg text-text-base focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
				id="email"
				type="email"
				disabled
			/>
			<p class="text-sm text-muted mt-1">Email cannot be changed</p>
		</div>

		<div class="mb-6">
			<label class="block text-sm font-medium mb-2 text-text-base" for="fullName"> Full Name </label>
			<input
				bind:value={fullName}
				class="w-full px-4 py-3 bg-bg-base border border-border rounded-lg text-text-base focus:ring-2 focus:ring-purple focus:border-transparent transition-all"
				id="fullName"
				type="text"
				placeholder="Full Name"
				required
			/>
		</div>

		<div class="flex items-center justify-between">
			<button
				class="w-full px-6 py-3 bg-purple text-highlight rounded-lg hover:bg-purple-hover focus:ring-2 focus:ring-purple focus:ring-offset-2 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
				type="submit"
				disabled={loading || uploadingAvatar}
			>
				{#if loading}
					<svg class="animate-spin h-5 w-5 text-highlight inline mr-2" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Updating...
				{:else}
					Update Profile
				{/if}
			</button>
		</div>
	</form>
</div>
