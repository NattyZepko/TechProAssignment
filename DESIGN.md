# Design (Mass Points Explorer)

## A. Rendering Model Understanding

The way I understand deck.gl now is this:

- My data lives on the CPU as normal JavaScript objects.
- A deck.gl Layer (in this project, a `ScatterplotLayer`) knows how to read each field using accessor functions like `getPosition` or `getFillColor`.
- deck.gl takes these accessors and builds **GPU attributes** - basically typed arrays the GPU can work with.
- Once the layer is initialized, the GPU does nearly all the drawing work each frame.

The important part is:
deck.gl reacts differently depending on what changes.

- If the data reference changes, it may rebuild attributes - (expensive).
- If only small props change (like filterRange or color uniforms), deck.gl updates just what it needs and reuses existing buffers - (cheap).

For this project I enable GPU-based filtering through the `DataFilterExtension` in [src/layers/createPointsLayer.js](src/layers/createPointsLayer.js).
That means I can leave the dataset untouched on the CPU and let the GPU decide whether a point should be shown.

## B. Expensive vs. Cheap Operations

Through testing and some trial and error, the division is pretty straightforward:

### Expensive (bad for scrubbing):

- Rebuilding arrays on every update (filter, map, slice, etc.)
- Changing the data reference
- Recreating the deck.gl layer
- Generating new per-point arrays (colors, positions, etc.) on each slider move

All of these scale with the size of the dataset and break the “instant update” requirement.

### Cheap (good for scrubbing):

- Updating small props like `filterRange` or `filterCategories`
- Keeping the layer instance stable
- Keeping the dataset stable
- Offloading the actual show/hide logic to the GPU

This is why the architecture sticks to "one layer, one dataset, tiny updates."

## C. Data Flow Architecture

This addresses the four required points.

1. Where the full dataset lives

The entire dataset sits in a single array called points, owned by [src/App.vue](src/App.vue).
After loading, I don’t replace this array — I clear it and refill it in-place so the reference never changes.

2. What happens to this dataset when filters change

Nothing happens to the base dataset.
Scrubbing or toggling categories only updates small filter-related state (`valueMin`, `valueMax`, and the enabled categories).
The data doesn't move or duplicate.

3. How deck.gl accesses the data

MapCanvas.vue receives the stable `points` array and passes it as `props.points` to deck.gl as data.
The layer is created once via [src/layers/createPointsLayer.js](src/layers/createPointsLayer.js) and uses straightforward accessors like `getPosition: (d) => d.position` to read each field.

4. Why your approach avoids CPU reprocessing

Since I never build a "filtered dataset", the CPU never loops through 250k items on updates.
The GPU handles the filter checks through the `DataFilterExtension` configured in [src/layers/createPointsLayer.js](src/layers/createPointsLayer.js), and I only tell the layer about new ranges or categories via `setProps`.
So even when scrubbing the slider rapidly, nothing scales with N on the main thread.

## D. Filter Update Strategy

1. How filter state is stored and updated

Numeric filters (min/max) are Vue refs inside [src/App.vue](src/App.vue).
Category selection is a small object keyed by category ID.
Whenever the UI changes, I recompute a compact list of selected category IDs by iterating the category config and not the dataset.

2. How deck.gl learns about filter changes

When the map loads, I store a reference to the created layer through the `layer-ready` event from [src/components/MapCanvas.vue](src/components/MapCanvas.vue).
Every time a filter changes, I call `applyLayerFilters(layer, ...)`, which only updates `filterRange` and `filterCategories`.

3. Why your approach is efficient for rapid scrubbing

- No per-point work.
- No new arrays proportional to data size.
- Only tiny prop changes.
- GPU does the actual filtering.
- `DataFilterExtension` in [src/layers/createPointsLayer.js](src/layers/createPointsLayer.js) is what makes this possible.

## E. Performance Validation

I validated the architecture through tests that check behavior, without timing.

1. Do not rebuild a filtered data array / no new arrays per filter change

[src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js) spies on `Array.prototype.filter` and `Array.prototype.map` and ensures they aren't touched during filter changes.

2. Do not recreate the deck.gl layer on every interaction

The layer is created once in [src/components/MapCanvas.vue](src/components/MapCanvas.vue), and strict-equality checks in [src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js) verify the instance stays the same during scrubbing.

3. Main dataset reference remains stable

`points` is never reassigned, only modified in-place on load.
This is also checked in tests.

4. Filter changes applied incrementally (lightweight updates)

All filter changes go through `applyLayerFilters()` which only touches `filterRange` and `filterCategories`.
The GPU path (`DataFilterExtension`) is enabled from the start, so deck.gl never tries to rebuild buffers.

I also checked this manually in the browser: references remained stable, and scrubbing stayed responsive even with large datasets. I promise you I move the mouse very fast.

## F. Alternative Approaches

While building the architecture, I looked at a few different ways to meet the constraints (stable data, stable layer, no CPU filtering, lightweight updates).
Here are the alternatives I considered and why I didn’t end up using them for this version.

1. During normalization, assign each category a numeric index (0...K-1) and use that instead of string IDs in the filtering path.
   Filtering still happens fully on the GPU, but `getFilterCategory` returns a small integer instead of a string.
   Its a valid choice, but the actual category strings felt simpler to read and debug, especially when checking tooltips, tests, or logs.
   Performance was already well within the goal, so the extra encoding step didn’t feel necessary, but it might be necessary if the number of categories grows or if I want to push the GPU filter to be as compact as possible.

2. Instead of one big layer, I would create a separate ScatterplotLayer for each category.
   Each layer would get the full dataset but only draw points matching its category, and I'd toggle visibility/opacity or use a fixed GPU predicate per layer.
   This way there's still no CPU filtering, and all the layers remain stable, but again, managing multiple layers adds overhead and bookkeeping for not much gain when the categories are few and the built-in categorical filtering already works well in a single layer.
   If we wanted each category to have a different style, radius, or if the categories behave differently in the future, then maybe it would be considered.

3. I would Create one Deck / MapboxOverlay instance on map load and update its layers prop directly, instead of using a `MapboxLayer`.
   If both the overlay and the layer instances stay stable, and only lightweight props change, it still checks all the boxes, but using MapboxLayer makes the "single stable layer instance" very explicit, and it's also easier to expose that instance for different purposes and tests. It fit the assignment's requirements more naturally.

## G. Uncertainties & Assumptions

A couple of things I had to assume or double-check:

- Viewing globe projection and zooming out to the max hides all of the points (but they're interactable, you can hover and see the tooltip). Mercader projection doesn't have that issue. I do not know why.
- deck.gl sometimes ignores updated props if the reference is mutated in-place. That's why [src/filters/applyLayerFilters.js](src/filters/applyLayerFilters.js) uses a simple double-buffer technique for small arrays.

The general approach is built around the idea that GPU filtering is the correct tool here, and that stable references ensure deck.gl avoids unnecessary work.
