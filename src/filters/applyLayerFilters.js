// Applies GPU filter props to an existing layer wrapper.
// Intentionally avoids CPU filtering of the main dataset.
//
// Important: deck.gl compares props to decide what changed. If we mutate and re-use
// the same array instance for `filterRange` / `filterCategories`, the change may be
// missed because the “old” and “new” props can point at the same mutated object.
//
// To satisfy the “no new arrays on each interaction” constraint while still
// changing references, we double-buffer the small arrays used for filter props.

const FILTER_RANGE_A = [0, 0];
const FILTER_RANGE_B = [0, 0];
const FILTER_CATEGORIES_A = [];
const FILTER_CATEGORIES_B = [];
let toggle = false;

export function applyLayerFilters(
	layer,
	{ valueMin, valueMax, selectedCategoryIds },
) {
	if (!layer) return;

	const filterRange = toggle ? FILTER_RANGE_A : FILTER_RANGE_B;
	const filterCategories = toggle ? FILTER_CATEGORIES_A : FILTER_CATEGORIES_B;
	toggle = !toggle;

	filterRange[0] = valueMin;
	filterRange[1] = valueMax;

	filterCategories.length = 0;
	for (const id of selectedCategoryIds) filterCategories.push(id);

	layer.setProps({
		filterRange,
		filterCategories,
	});
}
