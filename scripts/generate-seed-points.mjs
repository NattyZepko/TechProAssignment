import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { g } from 'vitest/dist/suite-dWqIFb_-.js';
import { CATEGORIES } from '../src/config/categories.js';
import * as geoConstants from '../src/constants/geo.js';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'public', 'seed-points.json');

function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

async function main() {
	const rng = mulberry32(20260122); // fixed seed for determinism, this is the current date

	const points = [];
	const center = { lng: -122.45, lat: 37.78 };

	for (let i = 0; i < geoConstants.SEED_POINT_COUNT; i++) {
		const categoryId = CATEGORIES[i % CATEGORIES.length]?.id;
		if (!categoryId)
			throw new Error('CATEGORIES must contain at least one item');

		const lng = center.lng + (rng() - 0.5) * geoConstants.LONGITUDE_JITTER;
		const lat = center.lat + (rng() - 0.5) * geoConstants.LATITUDE_JITTER;

		const point = {
			position: [
				clamp(
					Number(lng.toFixed(geoConstants.COORDINATED_DECIMAL_DIGITS)),
					geoConstants.MIN_LONGITUDE,
					geoConstants.MAX_LONGITUDE,
				),
				clamp(
					Number(lat.toFixed(geoConstants.COORDINATED_DECIMAL_DIGITS)),
					geoConstants.MIN_LATITUDE,
					geoConstants.MAX_LATITUDE,
				),
			],
			// Intentionally include fields that will sometimes be removed/obfuscated.
			id: `seed_${i}`,
			value: Math.round(
				rng() * (geoConstants.VALUE_MAX - geoConstants.VALUE_MIN) +
					geoConstants.VALUE_MIN,
			),
			category: categoryId,
		};

		// Deterministically obfuscate some fields to exercise derivation logic.
		if (i % 7 === 0) delete point.id;
		if (i % 9 === 0) delete point.category;
		if (i % 11 === 0) delete point.value;

		points.push(point);
	}

	await writeFile(OUT_FILE, JSON.stringify(points, null, 2), 'utf8');
	console.log(`Wrote ${points.length} seed points to ${OUT_FILE}`);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
