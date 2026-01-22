// Applies GPU filter props to an existing layer wrapper.
// Intentionally avoids CPU filtering of the main dataset.

export function applyLayerFilters(
	layer,
	{ valueMin, valueMax, selectedCategoryIds },
) {
	if (!layer) return;

	layer.setProps({
		filterRange: [valueMin, valueMax],
		// Must be a new reference so deck.gl detects prop change.
		filterCategories: selectedCategoryIds.slice(),
	});
}
