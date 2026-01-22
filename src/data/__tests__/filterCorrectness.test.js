import { describe, expect, test } from 'vitest';

import { CATEGORIES } from '../../config/categories.js';

function isVisible(point, { min, max, categories }) {
	return (
		point.value >= min &&
		point.value <= max &&
		categories.includes(point.category)
	);
}

describe('filter correctness (CPU predicate mirrors GPU intent)', () => {
	test('includes only points matching both filters', () => {
		const categoryIds = CATEGORIES.map((c) => c.id);
		if (categoryIds.length === 0)
			throw new Error('CATEGORIES must contain at least one item');
		const [category0, category1 = categoryIds[0]] = categoryIds;

		const points = [
			{ id: '1', value: 10, category: category0 },
			{ id: '2', value: 50, category: category1 },
			{ id: '3', value: 90, category: category0 },
		];

		const filters = { min: 20, max: 80, categories: [category1] };
		const visible = points
			.filter((p) => isVisible(p, filters))
			.map((p) => p.id);

		expect(visible).toEqual(['2']);
	});

	test('inclusive boundaries for min/max', () => {
		const [category0] = CATEGORIES;
		const filters = { min: 10, max: 20, categories: [category0.id] };

		const points = [
			{ id: '1', value: 10, category: category0.id }, // exactly min
			{ id: '2', value: 20, category: category0.id }, // exactly max
			{ id: '3', value: 9, category: category0.id },
			{ id: '4', value: 21, category: category0.id },
		];

		const visible = points
			.filter((p) => isVisible(p, filters))
			.map((p) => p.id);

		expect(visible).toEqual(['1', '2']);
	});

	test('supports multiple categories', () => {
		const [cat0, cat1] = CATEGORIES.map((c) => c.id);
		const filters = { min: 0, max: 100, categories: [cat0, cat1] };

		const points = [
			{ id: '1', value: 10, category: cat0 },
			{ id: '2', value: 50, category: cat1 },
			{ id: '3', value: 90, category: 'other' },
		];

		const visible = points
			.filter((p) => isVisible(p, filters))
			.map((p) => p.id);

		expect(visible).toEqual(['1', '2']);
	});
});
