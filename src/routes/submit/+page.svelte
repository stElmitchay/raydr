<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { data, form } = $props();
	let submitting = $state(false);
	const isInternal = $derived(data.profile?.role === 'internal');
	const profile = $derived(data.profile);
	const preselectedRequest = $derived(page.url.searchParams.get('request') ?? '');

	type Step = {
		name: string;
		label: string;
		hint?: string;
		type: 'text' | 'textarea' | 'url' | 'number' | 'select' | 'file' | 'review';
		required?: boolean;
		placeholder?: string;
		options?: { value: string; label: string }[];
	};

	let values = $state<Record<string, string>>({
		title: '',
		description: '',
		problem_statement: '',
		solution_summary: '',
		replaces_tool: '',
		annual_cost_replaced: '',
		estimated_hours_saved_weekly: '',
		tool_request_id: '',
		project_goals: '',
		target_audience: '',
		tech_stack: '',
		ai_tools_used: '',
		demo_url: '',
		repo_url: ''
	});

	$effect(() => {
		if (preselectedRequest) values.tool_request_id = preselectedRequest;
	});

	let screenshots = $state<File[]>([]);
	let fileInputEl: HTMLInputElement | undefined = $state();

	function buildSteps(internal: boolean, claimedRequests: any[]): Step[] {
		const steps: Step[] = [
			{ name: 'title', label: 'What\'s your project called?', type: 'text', required: true, placeholder: 'e.g., InvoiceBot' },
			{ name: 'description', label: 'Describe it in one sentence.', type: 'textarea', required: true, placeholder: 'What does it do?' },
			{ name: 'problem_statement', label: 'What problem does it solve?', type: 'textarea', required: true, placeholder: 'The pain point this addresses…' },
			{ name: 'solution_summary', label: 'How does it solve that problem?', type: 'textarea', required: true, placeholder: 'Your approach…' }
		];

		if (internal) {
			steps.push(
				{ name: 'replaces_tool', label: 'What tool or process does it replace?', type: 'text', placeholder: 'e.g., Jira, manual reporting', hint: 'Optional' },
				{ name: 'annual_cost_replaced', label: 'How much does it save per year?', type: 'number', placeholder: '0', hint: 'In dollars (optional)' },
				{ name: 'estimated_hours_saved_weekly', label: 'How many hours does it save weekly?', type: 'number', placeholder: '0', hint: 'Optional' }
			);
			if (claimedRequests?.length > 0) {
				steps.push({
					name: 'tool_request_id',
					label: 'Does this fulfill a request?',
					type: 'select',
					hint: 'Optional',
					options: [
						{ value: '', label: 'No — standalone project' },
						...claimedRequests.map((r: any) => ({
							value: r.id,
							label: `${r.title}${r.bonus_xp ? ` (+${r.bonus_xp} XP bounty)` : ''}`
						}))
					]
				});
			}
		} else {
			steps.push(
				{ name: 'project_goals', label: 'What are you trying to achieve?', type: 'textarea', required: true, placeholder: 'What\'s the vision? What does success look like?' },
				{ name: 'target_audience', label: 'Who is this for?', type: 'text', placeholder: 'e.g., small businesses, developers, students', hint: 'Optional' }
			);
		}

		steps.push(
			{ name: 'tech_stack', label: 'What\'s your tech stack?', type: 'text', placeholder: 'SvelteKit, Python, PostgreSQL', hint: 'Comma-separated (optional)' },
			{ name: 'ai_tools_used', label: 'Which AI tools did you use?', type: 'text', placeholder: 'Claude, Cursor, Copilot', hint: 'Comma-separated (optional)' },
			{ name: 'demo_url', label: 'Where can people see it?', type: 'url', placeholder: 'https:// or YouTube/Loom link', hint: 'Live demo URL or video walkthrough (optional)' },
			{ name: 'repo_url', label: 'Where\'s the code?', type: 'url', placeholder: 'https://github.com/…', hint: 'Repository URL (optional)' },
			{ name: 'screenshots', label: 'Add a few screenshots.', type: 'file', hint: 'Up to 5 images, max 5MB each (optional)' },
			{ name: 'review', label: 'Ready to submit?', type: 'review' }
		);

		return steps;
	}

	let currentStep = $state(0);
	const steps = $derived(buildSteps(isInternal, data.claimedRequests ?? []));
	const totalSteps = $derived(steps.length);
	const step = $derived(steps[currentStep]);
	const progress = $derived(((currentStep + 1) / totalSteps) * 100);
	const isLastStep = $derived(currentStep === totalSteps - 1);
	const canAdvance = $derived.by(() => {
		if (step.type === 'review' || step.type === 'file') return true;
		if (!step.required) return true;
		return (values[step.name] ?? '').trim().length > 0;
	});

	let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined = $state();

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
		screenshots = Array.from(input.files ?? []);
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
<div class="fixed top-16 right-6 md:right-10 z-40 text-data text-sm text-text-muted">
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
	<!-- Always-present file input (visually hidden unless on screenshots step) -->
	<input
		bind:this={fileInputEl}
		type="file"
		name="screenshots"
		multiple
		accept="image/jpeg,image/png,image/webp,image/gif"
		onchange={handleFileChange}
		class="sr-only"
	/>

	<div class="w-full max-w-2xl mx-auto px-6 md:px-10 py-20">
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
										{screenshots.length > 0 ? `${screenshots.length} image${screenshots.length === 1 ? '' : 's'}` : '—'}
									{:else if s.type === 'select'}
										{s.options?.find(o => o.value === values[s.name])?.label ?? '—'}
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
								class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-xl md:text-2xl text-text placeholder:text-text-muted/50 resize-none py-3 transition-colors leading-snug"
							></textarea>
						{:else if step.type === 'select'}
							<select
								bind:this={inputEl as HTMLSelectElement}
								bind:value={values[step.name]}
								class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-xl md:text-2xl text-text py-3 transition-colors"
							>
								{#each step.options ?? [] as opt (opt.value)}
									<option value={opt.value} class="bg-surface text-text">{opt.label}</option>
								{/each}
							</select>
						{:else if step.type === 'file'}
							<button
								type="button"
								onclick={() => fileInputEl?.click()}
								class="w-full border-2 border-dashed border-border hover:border-border-strong hover:bg-surface-alt transition-colors py-12 text-center group"
							>
								{#if screenshots.length > 0}
									<p class="text-xl text-text font-serif">
										{screenshots.length} {screenshots.length === 1 ? 'image' : 'images'} selected
									</p>
									<p class="text-sm text-text-muted mt-2">Click to change</p>
								{:else}
									<p class="text-xl text-text-secondary group-hover:text-text transition-colors font-serif italic">
										Click to upload screenshots
									</p>
									<p class="text-sm text-text-muted mt-2">JPEG, PNG, WebP, GIF</p>
								{/if}
							</button>
						{:else}
							<input
								bind:this={inputEl as HTMLInputElement}
								bind:value={values[step.name]}
								type={step.type}
								placeholder={step.placeholder}
								class="w-full bg-transparent border-0 border-b border-border focus:border-text outline-none text-2xl md:text-3xl text-text placeholder:text-text-muted/50 py-3 transition-colors"
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
							<a href="/auth/github" class="text-text link-draw">Connect GitHub</a> to enable AI analysis on your repo
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
