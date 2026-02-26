<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();
	let submitting = $state(false);

	const inputClass = 'glass-input w-full px-4 py-2.5 text-sm text-text';
	const labelClass = 'block text-sm font-medium text-text mb-1';

	// Pre-select request from URL query param (e.g., /submit?request=uuid)
	const preselectedRequest = $derived(page.url.searchParams.get('request') ?? '');
</script>

<div class="max-w-xl mx-auto space-y-8">
	<div>
		<h1 class="text-3xl font-display font-bold text-text tracking-tighter">Submit Project</h1>
		<p class="text-sm text-text-muted mt-1">Share what you've built</p>
	</div>

	{#if form?.error}
		<div class="glass-card p-3 border-danger/30 text-sm text-danger" style="border-color: rgba(239, 68, 68, 0.3);">{form.error}</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="space-y-6"
	>
		<div class="glass-card p-6 space-y-4">
			<h3 class="text-sm font-display font-semibold text-text">About</h3>
			<div>
				<label for="title" class={labelClass}>Project Name *</label>
				<input id="title" name="title" type="text" placeholder="e.g., InvoiceBot" class={inputClass} required />
			</div>
			<div>
				<label for="description" class={labelClass}>Short Description *</label>
				<textarea id="description" name="description" placeholder="What does it do?" rows="2" class={inputClass} required></textarea>
			</div>
			<div>
				<label for="problem_statement" class={labelClass}>Problem *</label>
				<textarea id="problem_statement" name="problem_statement" placeholder="What problem does this solve?" rows="2" class={inputClass} required></textarea>
			</div>
			<div>
				<label for="solution_summary" class={labelClass}>Solution *</label>
				<textarea id="solution_summary" name="solution_summary" placeholder="How does it solve it?" rows="2" class={inputClass} required></textarea>
			</div>
			{#if data.claimedRequests?.length > 0}
				<div>
					<label for="tool_request_id" class={labelClass}>Fulfills Request</label>
					<select id="tool_request_id" name="tool_request_id" class={inputClass} value={preselectedRequest}>
						<option value="">None — standalone project</option>
						{#each data.claimedRequests as req}
							<option value={req.id}>{req.title}{req.bonus_xp ? ` (+${req.bonus_xp} XP bounty)` : ''}</option>
						{/each}
					</select>
					<p class="text-xs text-text-muted mt-1">Link this project to a tool request you claimed</p>
				</div>
			{/if}
		</div>

		<div class="glass-card p-6 space-y-4">
			<h3 class="text-sm font-display font-semibold text-text">Impact</h3>
			<div>
				<label for="replaces_tool" class={labelClass}>Replaces Tool</label>
				<input id="replaces_tool" name="replaces_tool" type="text" placeholder="e.g., Jira, manual process" class={inputClass} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="annual_cost_replaced" class={labelClass}>Annual Cost Saved ($)</label>
					<input id="annual_cost_replaced" name="annual_cost_replaced" type="number" placeholder="0" class={inputClass} />
				</div>
				<div>
					<label for="estimated_hours_saved_weekly" class={labelClass}>Hours Saved / Week</label>
					<input id="estimated_hours_saved_weekly" name="estimated_hours_saved_weekly" type="number" placeholder="0" class={inputClass} />
				</div>
			</div>
		</div>

		<div class="glass-card p-6 space-y-4">
			<h3 class="text-sm font-display font-semibold text-text">Tech</h3>
			<div>
				<label for="tech_stack" class={labelClass}>Tech Stack</label>
				<input id="tech_stack" name="tech_stack" type="text" placeholder="SvelteKit, Python, PostgreSQL" class={inputClass} />
				<p class="text-xs text-text-muted mt-1">Comma-separated</p>
			</div>
			<div>
				<label for="ai_tools_used" class={labelClass}>AI Tools Used</label>
				<input id="ai_tools_used" name="ai_tools_used" type="text" placeholder="Claude, Cursor, Copilot" class={inputClass} />
				<p class="text-xs text-text-muted mt-1">Comma-separated</p>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="demo_url" class={labelClass}>Demo URL</label>
					<input id="demo_url" name="demo_url" type="url" placeholder="https://" class={inputClass} />
				</div>
				<div>
					<label for="repo_url" class={labelClass}>Repo URL</label>
					<input id="repo_url" name="repo_url" type="url" placeholder="https://github.com/..." class={inputClass} />
				</div>
			</div>
		</div>

		<div class="glass-card p-6 space-y-4">
			<h3 class="text-sm font-display font-semibold text-text">Media</h3>
			<div>
				<label for="screenshots" class={labelClass}>Screenshots</label>
				<input
					id="screenshots"
					name="screenshots"
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif"
					class="glass-input w-full px-4 py-2.5 text-sm text-text file:mr-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary/20 file:text-primary-light hover:file:bg-primary/30 file:cursor-pointer file:transition-colors"
				/>
				<p class="text-xs text-text-muted mt-1">Up to 5 images (JPEG, PNG, WebP, GIF). Max 5MB each.</p>
			</div>
			<div>
				<label for="video_url" class={labelClass}>Video URL</label>
				<input id="video_url" name="video_url" type="url" placeholder="https://youtube.com/watch?v=... or https://loom.com/..." class={inputClass} />
				<p class="text-xs text-text-muted mt-1">YouTube or Loom link</p>
			</div>
		</div>

		<button
			type="submit"
			disabled={submitting}
			class="btn-primary w-full py-3 text-sm"
		>
			{submitting ? 'Submitting...' : 'Submit Project'}
		</button>
	</form>
</div>
