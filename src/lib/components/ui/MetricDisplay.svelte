<script lang="ts">
	let { value, label, size = 'default' }: {
		value: string;
		label: string;
		size?: 'default' | 'large' | 'small';
	} = $props();
</script>

<div class="flex flex-col">
	<span class="text-data {size === 'large' ? 'text-3xl md:text-4xl' : size === 'small' ? 'text-lg' : 'text-2xl'} text-text font-semibold">
		{value}
	</span>
	<span class="heading-section mt-1.5">{label}</span>
</div>
