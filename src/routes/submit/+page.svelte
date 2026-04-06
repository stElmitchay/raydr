<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();
	let submitting = $state(false);
	const isInternal = $derived(data.profile?.role === 'internal');

	const preselectedRequest = $derived(page.url.searchParams.get('request') ?? '');
	const profile = $derived(data.profile);
</script>

<div class="max-w-xl mx-auto px-6 md:px-10 py-10">
	<h1 class="heading-page mb-2 animate-fade-up stagger-1">Submit Project</h1>
	<p class="text-sm text-text-muted mb-8 animate-fade-up stagger-2">
		{isInternal ? 'Share what you\'ve built for the team' : 'Share what you\'re building'}
	</p>

	{#if form?.error}
		<div class="border border-negative text-negative text-sm px-4 py-2.5 mb-6">{form.error}</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => { submitting = false; await update(); };
		}}
		class="space-y-10 animate-fade-up stagger-3"
	>
		<!-- About (shared) -->
		<div class="space-y-5">
			<div class="heading-section border-b border-border pb-2">About</div>
			<div>
				<label for="title" class="heading-section block mb-2">Project Name *</label>
				<input id="title" name="title" type="text" placeholder="e.g., InvoiceBot" class="input-editorial" required />
			</div>
			<div>
				<label for="description" class="heading-section block mb-2">Short Description *</label>
				<textarea id="description" name="description" placeholder="What does it do?" rows="2" class="input-box" required></textarea>
			</div>
			<div>
				<label for="problem_statement" class="heading-section block mb-2">Problem *</label>
				<textarea id="problem_statement" name="problem_statement" placeholder="What problem does this solve?" rows="2" class="input-box" required></textarea>
			</div>
			<div>
				<label for="solution_summary" class="heading-section block mb-2">Solution *</label>
				<textarea id="solution_summary" name="solution_summary" placeholder="How does it solve it?" rows="2" class="input-box" required></textarea>
			</div>
		</div>

		<!-- Internal: Impact Metrics -->
		{#if isInternal}
			<div class="space-y-5">
				<div class="heading-section border-b border-border pb-2">Impact</div>
				<div>
					<label for="replaces_tool" class="heading-section block mb-2">Replaces Tool</label>
					<input id="replaces_tool" name="replaces_tool" type="text" placeholder="e.g., Jira, manual process" class="input-editorial" />
				</div>
				<div class="grid grid-cols-2 gap-6">
					<div>
						<label for="annual_cost_replaced" class="heading-section block mb-2">Annual Cost Saved ($)</label>
						<input id="annual_cost_replaced" name="annual_cost_replaced" type="number" placeholder="0" class="input-editorial" />
					</div>
					<div>
						<label for="estimated_hours_saved_weekly" class="heading-section block mb-2">Hours Saved / Week</label>
						<input id="estimated_hours_saved_weekly" name="estimated_hours_saved_weekly" type="number" placeholder="0" class="input-editorial" />
					</div>
				</div>
				{#if data.claimedRequests?.length > 0}
					<div>
						<label for="tool_request_id" class="heading-section block mb-2">Fulfills Request</label>
						<select id="tool_request_id" name="tool_request_id" class="input-box" value={preselectedRequest}>
							<option value="">None — standalone project</option>
							{#each data.claimedRequests as req}
								<option value={req.id}>{req.title}{req.bonus_xp ? ` (+${req.bonus_xp} XP bounty)` : ''}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Community: Project Goals -->
		{#if !isInternal}
			<div class="space-y-5">
				<div class="heading-section border-b border-border pb-2">Goals</div>
				<div>
					<label for="project_goals" class="heading-section block mb-2">What are you trying to achieve? *</label>
					<textarea id="project_goals" name="project_goals" placeholder="What's the vision for this project? What does success look like?" rows="3" class="input-box" required></textarea>
				</div>
				<div>
					<label for="target_audience" class="heading-section block mb-2">Who is this for?</label>
					<input id="target_audience" name="target_audience" type="text" placeholder="e.g., small businesses, students, developers" class="input-editorial" />
				</div>
			</div>
		{/if}

		<!-- Tech (shared) -->
		<div class="space-y-5">
			<div class="heading-section border-b border-border pb-2">Tech</div>
			<div>
				<label for="tech_stack" class="heading-section block mb-2">Tech Stack</label>
				<input id="tech_stack" name="tech_stack" type="text" placeholder="SvelteKit, Python, PostgreSQL" class="input-editorial" />
				<p class="text-xs text-text-muted mt-1">Comma-separated</p>
			</div>
			<div>
				<label for="ai_tools_used" class="heading-section block mb-2">AI Tools Used</label>
				<input id="ai_tools_used" name="ai_tools_used" type="text" placeholder="Claude, Cursor, Copilot" class="input-editorial" />
				<p class="text-xs text-text-muted mt-1">Comma-separated</p>
			</div>
			<div class="grid grid-cols-2 gap-6">
				<div>
					<label for="demo_url" class="heading-section block mb-2">Demo URL</label>
					<input id="demo_url" name="demo_url" type="url" placeholder="https://" class="input-editorial" />
				</div>
				<div>
					<label for="repo_url" class="heading-section block mb-2">Repo URL</label>
					<input id="repo_url" name="repo_url" type="url" placeholder="https://github.com/..." class="input-editorial" />
					{#if !profile?.github_connected}
						<p class="text-xs text-text-muted mt-1">
							<a href="/auth/github" class="text-text link-draw">Connect GitHub</a> for AI analysis
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Media (shared) -->
		<div class="space-y-5">
			<div class="heading-section border-b border-border pb-2">Media</div>
			<div>
				<label for="screenshots" class="heading-section block mb-2">Screenshots</label>
				<input
					id="screenshots"
					name="screenshots"
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="w-full text-sm text-text-secondary file:mr-3 file:px-3 file:py-1.5 file:border file:border-border file:bg-surface-alt file:text-xs file:font-medium file:text-text file:cursor-pointer hover:file:bg-surface-hover file:transition-colors"
				/>
				<p class="text-xs text-text-muted mt-1">Up to 5 images. Max 5MB each.</p>
			</div>
			<div>
				<label for="video_url" class="heading-section block mb-2">Video URL</label>
				<input id="video_url" name="video_url" type="url" placeholder="YouTube or Loom link" class="input-editorial" />
			</div>
		</div>

		<button type="submit" disabled={submitting} class="btn-primary w-full py-3 text-sm">
			{submitting ? 'Submitting...' : 'Submit Project'}
		</button>
	</form>
</div>
