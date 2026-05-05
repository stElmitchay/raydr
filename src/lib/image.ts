/**
 * Image URL helpers.
 *
 * Supabase Storage exposes two paths:
 *   /storage/v1/object/public/<bucket>/<key>   — original, uncached resize
 *   /storage/v1/render/image/public/<bucket>/<key>   — on-the-fly resize/quality
 *
 * `optimizeImage` rewrites the first form into the second and appends the
 * requested width + quality. Non-Supabase URLs (GitHub avatars, externally
 * hosted media) are returned untouched.
 */
export function optimizeImage(url: string | null | undefined, width: number, quality = 80): string {
	if (!url) return '';
	// Already transformed — leave it.
	if (url.includes('/storage/v1/render/image/')) return url;
	// Supabase public object URL — rewrite to the render endpoint.
	if (url.includes('/storage/v1/object/public/')) {
		const rewritten = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
		const sep = rewritten.includes('?') ? '&' : '?';
		return `${rewritten}${sep}width=${width}&quality=${quality}`;
	}
	// External (GitHub avatars, etc.) — can't transform, hand back as-is.
	return url;
}
