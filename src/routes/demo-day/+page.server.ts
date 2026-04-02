import type { PageServerLoad } from './$types';
import { getCurrentDemoCycle } from '$lib/server/demo-cycle';
import { getDemoDayData } from '$lib/server/demo-day';
import { getCycleTheme } from '$lib/server/cycle-theme';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: season } = await supabase
		.from('seasons')
		.select('*')
		.eq('is_active', true)
		.single();

	const demoCycle = season
		? getCurrentDemoCycle(new Date(season.start_date))
		: 1;

	const [demoDayData, cycleTheme] = await Promise.all([
		getDemoDayData(supabase, season?.id ?? null, demoCycle),
		getCycleTheme(supabase, demoCycle, season?.id ?? null)
	]);

	return {
		season,
		demoCycle,
		cycleTheme,
		...demoDayData
	};
};
