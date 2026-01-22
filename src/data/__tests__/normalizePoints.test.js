import { describe, expect, test } from 'vitest';
import { normalizeSeedPoints } from '../normalizePoints.js';

import { CATEGORIES } from '../../config/categories.js';

describe('normalizeSeedPoints', () => {
	test('derives missing id/value/category deterministically', () => {
		const [category0] = CATEGORIES;
		if (!category0)
			throw new Error('CATEGORIES must contain at least one item');

		const seed = [
			{ position: [1, 2], id: 'x', value: 10, category: category0.id },
			{ position: [3, 4] },
			{ position: [5, 6] },
		];

		const a = normalizeSeedPoints(seed, { categories: CATEGORIES });
		const b = normalizeSeedPoints(seed, { categories: CATEGORIES });

		expect(a).toHaveLength(3);
		expect(a[0]).toEqual(b[0]);
		expect(a[1]).toEqual(b[1]);
		expect(a[2]).toEqual(b[2]);

		expect(typeof a[1].id).toBe('string');
		expect(typeof a[1].category).toBe('string');
		expect(typeof a[1].value).toBe('number');
	});

	test('throws on invalid position', () => {
		expect(() =>
			normalizeSeedPoints([{ id: 'x' }], { categories: CATEGORIES }),
		).toThrow();
	});
});
