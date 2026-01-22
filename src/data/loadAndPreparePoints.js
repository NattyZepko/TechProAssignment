import { normalizeSeedPoints } from './normalizePoints.js';
import { expandPoints } from './pointsExpansion.js';

export async function loadAndPreparePoints({ targetCount, categories }) {
	const res = await fetch('/seed-points.json', { cache: 'no-store' });
	if (!res.ok) {
		throw new Error(
			`Failed to load seed-points.json: ${res.status} ${res.statusText}`,
		);
	}

	const seed = await res.json();
	const normalized = normalizeSeedPoints(seed, { categories });
	const expanded = expandPoints(normalized, { targetCount, categories });

	const valueDomain = expanded.meta.valueDomain;

	// Return array + meta (meta stored on the array itself so callers can avoid allocations).
	expanded.meta = { valueDomain };
	return expanded;
}
