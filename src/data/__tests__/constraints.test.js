import { mount } from '@vue/test-utils';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { defineComponent } from 'vue';
import { CATEGORIES } from '../../config/categories.js';
import * as geoConstants from '../../constants/geo.js';
import { applyLayerFilters } from '../../filters/applyLayerFilters.js';
import { createPointsLayer } from '../../layers/createPointsLayer.js';

describe('architecture constraints (instrumentation)', () => {
	test('does not use Array.prototype.filter/map for filter updates', () => {
		const categoryIds = CATEGORIES.map((c) => c.id);
		if (categoryIds.length === 0)
			throw new Error('CATEGORIES must contain at least one item');
		const [category0, category1 = categoryIds[0]] = categoryIds;

		const filterSpy = vi.spyOn(Array.prototype, 'filter');
		const mapSpy = vi.spyOn(Array.prototype, 'map');

		const layer = { setProps: vi.fn() };

		applyLayerFilters(layer, {
			valueMin: 10,
			valueMax: 20,
			selectedCategoryIds: [category0],
		});
		applyLayerFilters(layer, {
			valueMin: 20,
			valueMax: 30,
			selectedCategoryIds: [category0, category1],
		});

		expect(layer.setProps).toHaveBeenCalledTimes(2);
		expect(filterSpy).not.toHaveBeenCalled();
		expect(mapSpy).not.toHaveBeenCalled();
	});

	test('layer instance remains stable; only lightweight props change', () => {
		const data = [
			{ id: '1', position: [0, 0], value: 10, category: CATEGORIES[0].id },
		];

		const layer = createPointsLayer({
			data,
			categories: CATEGORIES,
			onHover: () => {},
		});
		const initialLayerRef = layer;
		const initialDataRef = layer.props.data;

		applyLayerFilters(layer, {
			valueMin: 0,
			valueMax: 100,
			selectedCategoryIds: CATEGORIES.map((c) => c.id),
		});
		applyLayerFilters(layer, {
			valueMin: 20,
			valueMax: 80,
			selectedCategoryIds: [CATEGORIES[0].id],
		});

		// Assert we never created a new layer instance.
		expect(layer).toBe(initialLayerRef);
		// And we did not swap the base dataset reference.
		expect(layer.props.data).toBe(initialDataRef);
		// But lightweight filter props should update.
		expect(layer.props.filterRange).toEqual([20, 80]);
		expect(layer.props.filterCategories).toEqual([CATEGORIES[0].id]);
	});

	test('base dataset reference remains stable across filter updates (real app wiring)', async () => {
		const seedPath = path.resolve(process.cwd(), 'public/seed-points.json');
		const seedText = await readFile(seedPath, 'utf8');
		const seedJson = JSON.parse(seedText);

		const originalFetch = globalThis.fetch;
		vi.stubGlobal('fetch', async (url) => {
			if (url !== '/seed-points.json') {
				return {
					ok: false,
					status: 404,
					statusText: 'Not Found',
					json: async () => ({}),
				};
			}
			return {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: async () => seedJson,
			};
		});

		const layerSetProps = vi.fn();
		const stableLayer = { id: 'points-layer', setProps: layerSetProps };

		const MapCanvasStub = defineComponent({
			name: 'MapCanvas',
			props: {
				points: { type: Array, required: true },
				categories: { type: Array, required: true },
				initialViewState: { type: Object, required: true },
			},
			emits: ['layer-ready'],
			mounted() {
				this.$emit('layer-ready', stableLayer);
			},
			template: '<div />',
		});

		const FiltersPanelStub = defineComponent({
			name: 'FiltersPanel',
			props: {
				categories: { type: Array, required: true },
				categoryEnabled: { type: Object, required: true },
				valueMin: { type: Number, required: true },
				valueMax: { type: Number, required: true },
				valueDomainMin: { type: Number, required: true },
				valueDomainMax: { type: Number, required: true },
			},
			emits: ['toggle-category', 'set-value-min', 'set-value-max'],
			template: '<div />',
		});

		// Import App after stubbing fetch so its onMounted loader uses our real seed JSON.
		const { default: App } = await import('../../App.vue');
		const wrapper = mount(App, {
			global: {
				stubs: {
					MapCanvas: MapCanvasStub,
					FiltersPanel: FiltersPanelStub,
				},
			},
		});

		try {
			// Wait a couple of ticks for async loader + onMounted to complete.
			for (let i = 0; i < 25; i++) {
				if (globalThis.__MASS_POINTS_EXPLORER__?.points?.length) break;
				await Promise.resolve();
			}

			expect(globalThis.__MASS_POINTS_EXPLORER__).toBeTruthy();
			const { points, layer } = globalThis.__MASS_POINTS_EXPLORER__;
			const initialPointsRef = points;
			const initialPointsLen = points.length;
			const initialLayerRef = layer;

			expect(Array.isArray(initialPointsRef)).toBe(true);
			expect(initialPointsLen).toBeGreaterThan(0);
			expect(initialLayerRef).toBe(stableLayer);

			const filters = wrapper.getComponent({ name: 'FiltersPanel' });
			const domainMin =
				initialPointsRef.meta?.valueDomain?.[0] ?? geoConstants.VALUE_MIN;
			const domainMax =
				initialPointsRef.meta?.valueDomain?.[1] ?? geoConstants.VALUE_MAX;

			for (let step = 0; step < 50; step++) {
				const vMin = domainMin + (step % 10);
				const vMax = domainMax - (step % 10);
				filters.vm.$emit('set-value-min', vMin);
				filters.vm.$emit('set-value-max', vMax);

				if (step % 7 === 0) {
					filters.vm.$emit(
						'toggle-category',
						CATEGORIES[step % CATEGORIES.length].id,
					);
				}

				expect(globalThis.__MASS_POINTS_EXPLORER__.points).toBe(
					initialPointsRef,
				);
				expect(globalThis.__MASS_POINTS_EXPLORER__.points.length).toBe(
					initialPointsLen,
				);
				expect(globalThis.__MASS_POINTS_EXPLORER__.layer).toBe(initialLayerRef);
			}

			// Ensure filter updates actually touch the real filter-update path.
			expect(layerSetProps).toHaveBeenCalled();
			for (const call of layerSetProps.mock.calls) {
				const props = call[0];
				if (props.filterRange) {
					expect(Array.isArray(props.filterRange)).toBe(true);
					expect(props.filterRange).toHaveLength(2);
				}
			}
		} finally {
			wrapper.unmount();
			vi.unstubAllGlobals();
			if (originalFetch) globalThis.fetch = originalFetch;
		}
	}, 15000);
});
