# Design (Mass Points Explorer)

## Architecture overview

I built the app around a single idea: **the dataset stays stable and filtering happens on the GPU**.

- I load a small seed dataset at runtime (`/seed-points.json`), normalize it, and deterministically expand it to the target scale.
- I render points with a single deck.gl `ScatterplotLayer` mounted as a Mapbox custom layer.
- I apply filters by updating shader uniforms through deck.gl’s **DataFilterExtension** (so scrubbing stays smooth).

The main files are:

- Data generation (offline): [scripts/generate-seed-points.mjs](scripts/generate-seed-points.mjs)
- Normalization: [src/data/normalizePoints.js](src/data/normalizePoints.js)
- Expansion to 250k: [src/data/pointsExpansion.js](src/data/pointsExpansion.js)
- Map + deck wiring: [src/components/MapCanvas.vue](src/components/MapCanvas.vue)
- App state + filters: [src/App.vue](src/App.vue)

## How I satisfied the four performance constraints

### 1) I did not rebuild a filtered data array on every interaction

I chose to **never filter the point list in JavaScript** during interaction.

- The full dataset is passed to deck.gl once.
- On every slider scrub or category toggle, I only update `filterRange` and `filterCategories` props on the existing layer wrapper.
- The actual hide/show happens in the GPU filter shader.

### 2) I did not recreate the deck.gl layer on every interaction

I chose to keep a **single Mapbox custom layer wrapper instance** stable for the lifetime of the map.

- In [src/components/MapCanvas.vue](src/components/MapCanvas.vue), I create the Mapbox/Deck integration once during `map.on('load')`.
- Filter changes call `layer.setProps(...)` on that same wrapper instance.

deck.gl v9’s `@deck.gl/mapbox` root entry only exports `MapboxOverlay`, so I added a Vite alias that points at the internal `mapbox-layer` module. I chose this so I can keep a stable Mapbox custom layer wrapper and still use v9’s category filtering.

### 3) The main dataset reference remains stable

I created `points` once in [src/App.vue](src/App.vue) and **only mutate it in-place** when loading completes.

- The array identity does not change.
- Filter changes do not mutate or replace the data array.

I also expose `points` so that tests (and humans) can verify strict reference equality.

### 4) Filter changes are incremental and lightweight

I chose deck.gl’s `DataFilterExtension` because it is designed for exactly this constraint.

- `filterRange` updates are uniform updates; the cost is low and predictable.
- `filterCategories` updates rebuild the GPU bitmask used by the filter shader, without touching the main dataset.

## Live scrubbing

I implemented the numeric filter with two sliders (min/max). While the user scrubs, the app updates the layer props immediately.

I avoided any synchronous CPU work proportional to the dataset size during scrubbing; the expensive part (filtering) stays on the GPU.

## Category rendering

I made categories a configuration surface:

- I defined categories in [src/config/categories.js](src/config/categories.js).
- I derived UI chips and per-category colors from that list.

I did this so adding a new category is a one-line change in the config.

## Tooltip and picking

I enabled `pickable` on the Scatterplot layer and display a tooltip with:

- `id`
- `category`
- `value`

The tooltip is rendered in the map component to keep it close to the pick events.

## Validation and instrumentation

I exposed the key references for objective checks:

- `window.__MASS_POINTS_EXPLORER__.points`
- `window.__MASS_POINTS_EXPLORER__.layer`

I also added Vitest tests that instrument behavior rather than relying on timing.

## Performance Validation

- [src/data/**tests**/normalizePoints.test.js](src/data/__tests__/normalizePoints.test.js) validates deterministic derivation of fields.
- [src/data/**tests**/filterCorrectness.test.js](src/data/__tests__/filterCorrectness.test.js) validates that the filter logic (value range + category) is correct.
- [src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js) validates:
  - no CPU filtering (`Array.prototype.filter` / `Array.prototype.map`)
  - stable dataset reference
  - stable layer instance
  - filter updates reflected only as lightweight layer props
