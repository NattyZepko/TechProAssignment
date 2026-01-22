<script setup>
import { onMounted, ref, shallowRef } from 'vue';
import FiltersPanel from './components/FiltersPanel.vue';
import MapCanvas from './components/MapCanvas.vue';
import { CATEGORIES } from './config/categories.js';
import * as geoConstants from './constants/geo.js';
import { DEFAULT_VIEW_STATE, TARGET_POINT_COUNT } from './constants/geo.js';
import { loadAndPreparePoints } from './data/loadAndPreparePoints.js';
import { applyLayerFilters } from './filters/applyLayerFilters.js';

// Stable references required for instrumentation.
const points = []; // base dataset reference (stable)
const layer = shallowRef(null); // MapboxLayer reference (stable after init)

const loading = ref(true);
const errorMessage = ref('');

const valueMin = ref(geoConstants.VALUE_MIN);
const valueMax = ref(geoConstants.VALUE_MAX);
const valueDomainMin = ref(geoConstants.VALUE_MIN);
const valueDomainMax = ref(geoConstants.VALUE_MAX);

// Selection stored as booleans (no Set allocations during scrubbing)
const categoryEnabled = ref(
	Object.fromEntries(CATEGORIES.map((c) => [c.id, true])),
);

// Stable array reference: updated in-place.
const selectedCategoryIds = [];
for (const c of CATEGORIES) selectedCategoryIds.push(c.id);

function handleLayerReady(mapboxLayer) {
	layer.value = mapboxLayer;
	// Expose for performance/instrumentation checks.
	globalThis.__MASS_POINTS_EXPLORER__ = { points, layer: mapboxLayer };
	applyFilters();
}

function applyFilters() {
	if (!layer.value) return;

	selectedCategoryIds.length = 0;
	for (const c of CATEGORIES) {
		if (categoryEnabled.value[c.id]) selectedCategoryIds.push(c.id);
	}

	applyLayerFilters(layer.value, {
		valueMin: valueMin.value,
		valueMax: valueMax.value,
		selectedCategoryIds,
	});
}

function onToggleCategory(categoryId) {
	categoryEnabled.value[categoryId] = !categoryEnabled.value[categoryId];
	applyFilters();
}

function onSetValueMin(next) {
	valueMin.value = next;
	if (valueMin.value > valueMax.value) {
		valueMax.value = valueMin.value;
	}
	applyFilters();
}

function onSetValueMax(next) {
	valueMax.value = next;
	if (valueMax.value < valueMin.value) {
		valueMin.value = valueMax.value;
	}
	applyFilters();
}

onMounted(async () => {
	try {
		loading.value = true;
		const prepared = await loadAndPreparePoints({
			targetCount: TARGET_POINT_COUNT,
			categories: CATEGORIES,
		});

		// Keep base dataset reference stable: fill in-place.
		points.length = 0;
		for (const p of prepared) points.push(p);

		// Initialize defaults from dataset extents.
		valueDomainMin.value = prepared.meta.valueDomain[0];
		valueDomainMax.value = prepared.meta.valueDomain[1];
		valueMin.value = valueDomainMin.value;
		valueMax.value = valueDomainMax.value;

		applyFilters();
	} catch (err) {
		errorMessage.value = err instanceof Error ? err.message : String(err);
	} finally {
		loading.value = false;
	}
});

defineExpose({ points, layer });
</script>

<template>
	<div class="app">
		<div class="panel">
			<h1>Mass Points Explorer</h1>
			<small v-if="loading">Loading points…</small>
			<small v-else-if="errorMessage">Error: {{ errorMessage }}</small>
			<small v-else>Points loaded: {{ points.length.toLocaleString() }}</small>

			<div class="section">
				<FiltersPanel
					:categories="CATEGORIES"
					:category-enabled="categoryEnabled"
					:value-min="valueMin"
					:value-max="valueMax"
					:value-domain-min="valueDomainMin"
					:value-domain-max="valueDomainMax"
					@toggle-category="onToggleCategory"
					@set-value-min="onSetValueMin"
					@set-value-max="onSetValueMax"
				/>
			</div>

			<hr />
			<small>
				Exposed for instrumentation:
				<code>window.__MASS_POINTS_EXPLORER__.points</code> and
				<code>window.__MASS_POINTS_EXPLORER__.layer</code>
			</small>
		</div>

		<div class="map">
			<MapCanvas
				:points="points"
				:categories="CATEGORIES"
				:initial-view-state="DEFAULT_VIEW_STATE"
				@layer-ready="handleLayerReady"
			/>
		</div>
	</div>
</template>
