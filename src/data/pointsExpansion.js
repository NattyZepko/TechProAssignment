import {
	MAX_LATITUDE,
	MAX_LONGITUDE,
	MIN_LATITUDE,
	MIN_LONGITUDE,
	VALUE_MAX,
	VALUE_MIN,
} from '../constants/geo.js';
import {
	POINT_EXPANSION_JITTER_SPAN_DEGREES,
	POINT_EXPANSION_RNG_SEED,
	POINT_EXPANSION_VALUE_DRIFT_MAX_ABS,
} from '../constants/pointsExpansion.js';

function mulberry32(seed) {
	let a = seed >>> 0; // convert seed to a 32-bit unsigned integer
	return () => {
		a |= 0; // forces a into a 32-bit signed integer. In practice, it’s another "keep it 32-bit" safety step
		a = (a + 0x6d2b79f5) | 0; // add a large odd constant and keep it 32-bit signed (wrap-around on overflow)
		let t = Math.imul(a ^ (a >>> 15), 1 | a); // bitwise operations force 32-bit signed integer math, imul does a 32-bit signed integer multiplication
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; // more bitwise and imul to keep it 32-bit signed
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // final mixing, convert to unsigned and scale to [0, 1)
	};
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

export function expandPoints(seedPoints, { targetCount }) {
	if (!Array.isArray(seedPoints))
		throw new Error('seedPoints must be an array');
	if (!Number.isFinite(targetCount) || targetCount <= 0)
		throw new Error('targetCount must be positive');

	const out = new Array(targetCount);
	const rng = mulberry32(POINT_EXPANSION_RNG_SEED);

	let minValue = Infinity;
	let maxValue = -Infinity;

	for (let i = 0; i < targetCount; i++) {
		const base = seedPoints[i % seedPoints.length];

		// Deterministic jitter in degrees
		const jLng = (rng() - 0.5) * POINT_EXPANSION_JITTER_SPAN_DEGREES;
		const jLat = (rng() - 0.5) * POINT_EXPANSION_JITTER_SPAN_DEGREES;

		const lng = clamp(base.position[0] + jLng, MIN_LONGITUDE, MAX_LONGITUDE);
		const lat = clamp(base.position[1] + jLat, MIN_LATITUDE, MAX_LATITUDE);

		// Deterministic value drift
		const drift = Math.round(
			(rng() * 2 - 1) * POINT_EXPANSION_VALUE_DRIFT_MAX_ABS,
		);
		const value = clamp(base.value + drift, VALUE_MIN, VALUE_MAX);

		minValue = Math.min(minValue, value);
		maxValue = Math.max(maxValue, value);

		out[i] = {
			id: `${base.id}_${i}`,
			position: [lng, lat],
			value,
			category: base.category,
		};
	}

	out.meta = { valueDomain: [minValue, maxValue] };
	return out;
}
