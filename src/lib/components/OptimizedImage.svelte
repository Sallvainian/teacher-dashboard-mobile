<!--
Optimized Image Component using vite-imagetools

This component demonstrates how to use the new image optimization features.
It automatically generates WebP and AVIF formats for better performance.

Usage:
<OptimizedImage src="/path/to/image.jpg" alt="Description" />
<OptimizedImage src="/path/to/image.jpg?enhanced" alt="Enhanced image with AVIF/WebP" />
-->

<script lang="ts">
	let { src, alt, className = '', width = undefined, height = undefined, loading = 'lazy' } = $props<{
		src: string;
		alt: string;
		className?: string;
		width?: number | undefined;
		height?: number | undefined;
		loading?: 'lazy' | 'eager';
	}>();

	// Add enhanced query parameter for automatic format optimization
	const enhancedSrc = src.includes('?') ? `${src}&enhanced` : `${src}?enhanced`;
</script>

<!-- 
Example of how vite-imagetools can be used:
- Add ?enhanced to get automatic WebP/AVIF generation
- Add ?w=400&h=300 for specific dimensions
- Add ?format=webp for specific format
- Add ?quality=80 for specific quality
-->

{#if src.includes('?enhanced')}
	<!-- Image is already enhanced -->
	<img 
		{src} 
		{alt} 
		{width} 
		{height} 
		{loading}
		class={className}
	/>
{:else}
	<!-- Apply enhancement automatically -->
	<img 
		src={enhancedSrc} 
		{alt} 
		{width} 
		{height} 
		{loading}
		class={className}
	/>
{/if}

<!-- 
Example usage in your components:

<OptimizedImage 
	src="/static/hero-image.jpg" 
	alt="Educational dashboard hero image"
	className="w-full h-64 object-cover rounded-lg"
	loading="eager"
/>

<OptimizedImage 
	src="/static/student-avatar.png?w=100&h=100&format=webp" 
	alt="Student avatar"
	className="w-12 h-12 rounded-full"
/>
-->