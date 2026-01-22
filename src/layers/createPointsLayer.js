import { DataFilterExtension } from '@deck.gl/extensions';
import { ScatterplotLayer } from '@deck.gl/layers';
import MapboxLayer from '@deck.gl/mapbox-layer';
import { VALUE_MAX, VALUE_MIN } from '../constants/geo.js';

const dataFilterExtension = new DataFilterExtension({
	filterSize: 1,
	categorySize: 1,
});

const DEFAULT_COLOR = [200, 200, 200, 200];

export function createPointsLayer({ data, categories, onHover, getFillColor }) {
	const initialFilterCategories = (categories ?? []).map((c) => c.id);

	return new MapboxLayer({
		id: 'points-layer',
		type: ScatterplotLayer,
		data,
		getPosition: (d) => d.position,
		getRadius: 10,
		radiusUnits: 'pixels',
		radiusMinPixels: 2,
		radiusMaxPixels: 14,
		getFillColor: getFillColor ?? (() => DEFAULT_COLOR),

		// Hover picking
		pickable: true,
		autoHighlight: true,
		onHover,

		// GPU filters
		extensions: [dataFilterExtension],
		getFilterValue: (d) => d.value,
		filterRange: [VALUE_MIN, VALUE_MAX],
		getFilterCategory: (d) => d.category,
		filterCategories: initialFilterCategories,
	});
}
