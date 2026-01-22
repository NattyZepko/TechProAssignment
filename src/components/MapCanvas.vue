<script setup>
import mapboxgl from 'mapbox-gl';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createPointsLayer } from '../layers/createPointsLayer.js';

const props = defineProps({
	points: { type: Array, required: true },
	categories: { type: Array, required: true },
	initialViewState: { type: Object, required: true },
});

const emit = defineEmits(['layer-ready']);

const mapContainer = ref(null);
const tooltip = ref(null);

let map = null;
let pointsLayer = null;

let colorByCategory = null;
const DEFAULT_COLOR = [200, 200, 200, 200];

function buildColorLookup() {
	colorByCategory = new Map();
	for (const c of props.categories) {
		// Store as RGBA once to avoid allocating per-point color arrays.
		colorByCategory.set(c.id, [c.color[0], c.color[1], c.color[2], 200]);
	}
}

function initDeckLayer() {
	if (!colorByCategory) buildColorLookup();

	// MapboxLayer is the stable "layer" reference for instrumentation.
	pointsLayer = createPointsLayer({
		data: props.points,
		categories: props.categories,
		getFillColor: (d) => colorByCategory.get(d.category) || DEFAULT_COLOR,
		onHover: (info) => {
			if (!info?.object) {
				tooltip.value = null;
				return;
			}
			const { x, y, object } = info;
			const t = {
				x,
				y,
				id: object.id,
				category: object.category,
				value: object.value,
			};
			tooltip.value = t;
		},
	});

	emit('layer-ready', pointsLayer);
	map.addLayer(pointsLayer);
}

onMounted(() => {
	const token = import.meta.env.VITE_MAPBOX_TOKEN;
	if (!token) {
		throw new Error('Missing VITE_MAPBOX_TOKEN. See .env.example');
	}

	mapboxgl.accessToken = token;

	map = new mapboxgl.Map({
		container: mapContainer.value,
		style: 'mapbox://styles/mapbox/dark-v11',
		center: [props.initialViewState.longitude, props.initialViewState.latitude],
		zoom: props.initialViewState.zoom,
		bearing: props.initialViewState.bearing,
		pitch: props.initialViewState.pitch,
		antialias: true,
		projection: 'mercator',
	});

	map.on('load', () => {
		initDeckLayer();
	});
});

onBeforeUnmount(() => {
	if (map) {
		map.remove();
		map = null;
	}
});
</script>

<template>
	<div id="map" ref="mapContainer"></div>
	<div
		v-if="tooltip"
		class="tooltip"
		:style="{ left: `${tooltip.x + 12}px`, top: `${tooltip.y + 12}px` }"
	>
		<div><b>id</b>: {{ tooltip.id }}</div>
		<div><b>category</b>: {{ tooltip.category }}</div>
		<div><b>value</b>: {{ tooltip.value }}</div>
	</div>
</template>
