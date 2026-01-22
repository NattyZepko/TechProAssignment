import { VALUE_MAX, VALUE_MIN } from '../constants/geo.js';

function stableHash32(str) {
	// FNV-1a 32-bit
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

function deriveValue({ seedKey }) {
	const h = stableHash32(seedKey);
	return VALUE_MIN + (h % (VALUE_MAX - VALUE_MIN + 1));
}

function deriveCategory({ seedKey, categories }) {
	const h = stableHash32(seedKey + '|cat');
	return categories[h % categories.length].id;
}

function deriveId({ seedKey, index }) {
	const h = stableHash32(seedKey + '|id');
	return `pt_${index}_${h.toString(16)}`;
}

export function normalizeSeedPoints(raw, { categories }) {
	if (!Array.isArray(raw)) throw new Error('seed points must be an array');

	const out = new Array(raw.length);

	for (let i = 0; i < raw.length; i++) {
		const item = raw[i] ?? {};

		const position =
			Array.isArray(item.position) && item.position.length === 2
				? item.position
				: null;
		if (!position) {
			throw new Error(`seed point ${i} missing valid position`);
		}

		const [lng, lat] = position;
		const seedKey = `${lng.toFixed(6)},${lat.toFixed(6)}`;

		const value = Number.isFinite(item.value)
			? item.value
			: deriveValue({ seedKey });
		const category =
			typeof item.category === 'string'
				? item.category
				: deriveCategory({ seedKey, categories });
		const id =
			typeof item.id === 'string' ? item.id : deriveId({ seedKey, index: i });

		out[i] = {
			id,
			position: [lng, lat],
			value: clamp(Math.round(value), VALUE_MIN, VALUE_MAX),
			category,
		};
	}

	return out;
}
