<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { data, form } = $props();
	let submitting = $state(false);
	const profile = $derived(data.profile);

	type Step = {
		name: string;
		label: string;
		hint?: string;
		type: 'text' | 'textarea' | 'url' | 'file' | 'review';
		required?: boolean;
		placeholder?: string;
	};

	let values = $state<Record<string, string>>({
		title: '',
		description: '',
		repo_url: '',
		demo_url: ''
	});

	let media = $state<File[]>([]);
	let fileInputEl: HTMLInputElement | undefined = $state();

	function buildSteps(): Step[] {
		return [
			{ name: 'title', label: 'What\'s your project called?', type: 'text', required: true, placeholder: 'e.g., InvoiceBot' },
			{ name: 'description', label: 'Describe it in one sentence.', type: 'textarea', required: true, placeholder: 'What does it do?' },
			{ name: 'repo_url', label: 'Where\'s the code?', type: 'url', placeholder: 'https://github.com/…', hint: 'Repository URL — enables AI-powered analysis (optional)' },
			{ name: 'demo_url', label: 'Where can people see it?', type: 'url', placeholder: 'https:// or YouTube/Loom link', hint: 'Live demo URL or video walkthrough (optional)' },
			{ name: 'media', label: 'Add some media.', type: 'file', hint: 'Logo, screenshots, or anything visual — up to 5 images, max 5MB each (optional)' },
			{ name: 'review', label: 'Ready to submit?', type: 'review' }
		];
	}

	let currentStep = $state(0);
	const steps = $derived(buildSteps());
	const totalSteps = $derived(steps.length);
	const step = $derived(steps[currentStep]);
	const progress = $derived(((currentStep + 1) / totalSteps) * 100);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const canAdvance = $derived.by(() => {
		if (step.type === 'review' || step.type === 'file') return true;
		if (!step.required) return true;
		return (values[step.name] ?? '').trim().length > 0;
	});

	let inputEl: HTMLInputElement | HTMLTextAreaElement | undefined = $state();

	$effect(() => {
		// Re-focus when step changes
		currentStep;
		setTimeout(() => inputEl?.focus(), 380);
	});

	function next() {
		if (!canAdvance) return;
		if (currentStep < totalSteps - 1) currentStep++;
	}

	function prev() {
		if (currentStep > 0) currentStep--;
	}

	function goToStep(index: number) {
		currentStep = Math.max(0, Math.min(totalSteps - 1, index));
	}

	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isTextarea = target.tagName === 'TEXTAREA';
		const isFileInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'file';

		if (e.key === 'Enter' && !e.shiftKey && !isTextarea && !isFileInput) {
			e.preventDefault();
			if (!isLastStep) next();
		}
		if (e.key === 'Enter' && e.metaKey && isTextarea) {
			e.preventDefault();
			if (!isLastStep) next();
		}
		if (e.key === 'ArrowDown' && !isTextarea) {
			e.preventDefault();
			next();
		}
		if (e.key === 'ArrowUp' && !isTextarea) {
			e.preventDefault();
			prev();
		}
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		media = Array.from(input.files ?? []);
	}

	function findStepIndex(name: string): number {
		return steps.findIndex(s => s.name === name);
	}

	function summaryValue(name: string): string {
		const v = values[name];
		if (!v || !v.trim()) return '—';
		return v;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Progress Bar -->
<div class="fixed top-14 left-0 right-0 z-40 h-[2px] bg-border">
	<div class="h-full bg-text transition-all duration-300 ease-out" style="width: {progress}%"></div>
</div>

<!-- Step Counter -->
<div class="fixed top-16 right-5 sm:right-6 md:right-10 z-40 text-data text-sm text-text-muted">
	{String(currentStep + 1).padStart(2, '0')} <span class="text-text-muted/50">/ {String(totalSteps).padStart(2, '0')}</span>
</div>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => { submitting = false; await update(); };
	}}
	class="min-h-screen flex items-center"
>
	<!-- Hidden inputs that always submit current values -->
	{#each Object.entries(values) as [name, value] (name)}
		<input type="hidden" {name} {value} />
	{/each}
	<!-- Always-present file input (visually hidden unless on media step) -->
	<input
		bind:this={fileInputEl}
		type="file"
		name="media"
		multiple
		accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg"
		onchange={handleFileChange}
		class="sr-only"
	/>

	<div class="w-full max-w-2xl mx-auto px-5 sm:px-6 md:px-10 py-16 sm:py-20">
		{#key currentStep}
			<div
				in:fly={{ y: 30, duration: 400, easing: cubicOut, delay: 50 }}
				out:fade={{ duration: 150 }}
			>
				{#if step.type === 'review'}
					<!-- Review Screen -->
					<p class="heading-section mb-4">Final step</p>
					<h1 class="font-serif italic text-[clamp(2.5rem,6vw,4rem)] text-text leading-tight mb-10">
						Ready to submit?
					</h1>

					{#if form?.error}
						<div class="border border-negative text-negative text-sm px-4 py-3 mb-8">{form.error}</div>
					{/if}

					<div class="border-t border-border mb-10">
						{#each steps.slice(0, -1) as s (s.name)}
							<button
								type="button"
								onclick={() => goToStep(findStepIndex(s.name))}
								class="w-full flex items-baseline justify-between py-4 border-b border-border text-left group hover:bg-surface-alt transition-colors -mx-3 px-3"
							>
								<span class="heading-section flex-shrink-0">{s.label.replace(/[?.!]$/, '')}</span>
								<span class="leader-dots"></span>
								<span class="text-base text-text text-right max-w-[60%] truncate">
									{#if s.type === 'file'}
										{media.length > 0 ? `${media.length} file${media.length === 1 ? '' : 's'}` : '—'}
									{:else}
										{summaryValue(s.name)}
									{/if}
								</span>
							</button>
						{/each}
					</div>

					<div class="flex items-center gap-6">
						<button type="button" onclick={prev} class="text-base text-text-secondary link-draw">
							&larr; Edit
						</button>
						<button
							type="submit"
							disabled={submitting}
							class="btn-primary text-base px-8 py-3"
						>
							{submitting ? 'Submitting…' : 'Submit Project →'}
						</button>
					</div>
				{:else}
					<!-- Question Step -->
					<p class="heading-section mb-4">
						{currentStep + 1}
						{#if step.required}<span class="text-negative ml-1">*</span>{/if}
					</p>
					<h1 class="font-serif italic text-[clamp(2rem,5vw,3.5rem)] text-text leading-tight mb-8">
						{step.label}
					</h1>

					<div class="mb-3">
						{#if step.type === 'textarea'}
							<textarea
								bind:this={inputEl as HTMLTextAreaElement}
								bind:value={values[step.name]}
								placeholder={step.placeholder}
								rows="3"
								class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-lg sm:text-xl md:text-2xl text-text placeholder:text-text-muted/50 resize-none py-3 transition-colors leading-snug"
							></textarea>
						{:else if step.type === 'file'}
							<button
								type="button"
								onclick={() => fileInputEl?.click()}
								class="w-full border-2 border-dashed border-border hover:border-border-strong hover:bg-surface-alt transition-colors py-8 sm:py-12 text-center group"
							>
								{#if media.length > 0}
									<p class="text-xl text-text font-serif">
										{media.length} {media.length === 1 ? 'file' : 'files'} selected
									</p>
									<p class="text-sm text-text-muted mt-2">Click to change</p>
								{:else}
									<p class="text-xl text-text-secondary group-hover:text-text transition-colors font-serif italic">
										Click to upload media
									</p>
									<p class="text-sm text-text-muted mt-2">JPEG, PNG, WebP, GIF, SVG</p>
								{/if}
							</button>
						{:else}
							<input
								bind:this={inputEl as HTMLInputElement}
								bind:value={values[step.name]}
								type={step.type}
								placeholder={step.placeholder}
								class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-xl sm:text-2xl md:text-3xl text-text placeholder:text-text-muted/50 py-3 transition-colors"
							/>
						{/if}
					</div>

					{#if step.hint}
						<p class="text-sm text-text-muted mb-10">{step.hint}</p>
					{:else}
						<div class="mb-10"></div>
					{/if}

					{#if step.name === 'repo_url' && !profile?.github_connected}
						<p class="text-sm text-text-muted mb-6">
							<a href="/auth/github" class="text-text link-draw">Connect GitHub</a> first to enable AI-powered analysis
						</p>
					{/if}

					<!-- Action Row -->
					<div class="flex items-center gap-6">
						<button
							type="button"
							onclick={next}
							disabled={!canAdvance}
							class="btn-primary text-base px-6 py-3 disabled:opacity-30"
						>
							OK <span class="ml-2 text-xs opacity-60">↵</span>
						</button>
						<p class="text-sm text-text-muted hidden md:block">
							press <kbd class="text-text">Enter</kbd>
							{#if step.type === 'textarea'}
								<span class="text-text-muted/60">(⌘+Enter)</span>
							{/if}
						</p>
						{#if currentStep > 0}
							<button type="button" onclick={prev} class="ml-auto text-sm text-text-secondary link-draw">
								&larr; Back
							</button>
						{/if}
					</div>
				{/if}
			</div>
		{/key}
	</div>
</form>
