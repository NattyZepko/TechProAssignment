# Mass Points Explorer (Vue + Mapbox + deck.gl)

<img width="2551" height="911" alt="image" src="https://github.com/user-attachments/assets/fb70cf3f-2cfa-4827-ad8c-9fa2654de4d1" />

A Vue 3 single-page app that renders **50k–250k** geographic points on a Mapbox basemap using deck.gl, with **live (10+ Hz) slider scrubbing** and instant category filtering.

## Technologies

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/en)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Mapbox GL JS](https://img.shields.io/badge/Mapbox%20GL%20JS-3-000000?logo=mapbox&logoColor=white)](https://docs.mapbox.com/mapbox-gl-js/)
[![deck.gl](https://img.shields.io/badge/deck.gl-9-1a1a1a)](https://deck.gl/)
[![Vitest](https://img.shields.io/badge/Vitest-1-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev/)

## Quick links (repo source)

- App state + instrumentation exposure: [src/App.vue](src/App.vue)
- Mapbox + deck.gl integration: [src/components/MapCanvas.vue](src/components/MapCanvas.vue)
- Shared layer factory: [src/layers/createPointsLayer.js](src/layers/createPointsLayer.js)
- Filter updates (GPU props only): [src/filters/applyLayerFilters.js](src/filters/applyLayerFilters.js)
- Data pipeline (load → normalize → expand): [src/data/loadAndPreparePoints.js](src/data/loadAndPreparePoints.js)
- Categories config: [src/config/categories.js](src/config/categories.js)
- Key constants: [src/constants/geo.js](src/constants/geo.js) and [src/constants/pointsExpansion.js](src/constants/pointsExpansion.js)

## Architecture overview

The architecture is designed around the constraints: keep the base dataset stable, keep the layer stable, and update only lightweight GPU filter props during live interactions.

```text
scripts/generate-seed-points.mjs
	|
	v
public/seed-points.json
	|
	v
loadAndPreparePoints()
  | normalizeSeedPoints()
  | expandPoints()  -> (points array + meta.valueDomain)
	|
	v
App.vue
  - owns stable `points` array (filled in-place)
  - owns filter state (value range + categories)
  - exposes window.__MASS_POINTS_EXPLORER__ for instrumentation
	|
	| props: points[], categories, initialViewState
	v
MapCanvas.vue
  - Mapbox GL JS map
  - deck.gl MapboxLayer wrapping ScatterplotLayer
  - DataFilterExtension (GPU filtering)
	|
	| applyLayerFilters(): layer.setProps({ filterRange, filterCategories })
	v
GPU filtering (no JS data filtering during scrubbing)
```

## Setup & Run

### 1) Install dependencies

```bash
npm install
```

### 2) Set Mapbox token

Create a local `.env` file:

```bash
VITE_MAPBOX_TOKEN=...your token...
```

See [.env.example](.env.example) for the expected variable name.

### 3) (Optional) Regenerate deterministic seed

This overwrites the seed file deterministically.

```bash
npm run generate:seed
```

### 4) Start dev server

```bash
npm run dev
```

### Build / Preview

```bash
npm run build
npm run preview
```

## Configuration (constants you can modify)

- Target dataset size: `TARGET_POINT_COUNT` in [src/constants/geo.js](src/constants/geo.js)
- Value range domain: `VALUE_MIN` / `VALUE_MAX` in [src/constants/geo.js](src/constants/geo.js)
- Default camera: `DEFAULT_VIEW_STATE` in [src/constants/geo.js](src/constants/geo.js)
- Expansion behavior (spread + drift):
  - `POINT_EXPANSION_JITTER_SPAN_DEGREES`
  - `POINT_EXPANSION_VALUE_DRIFT_MAX_ABS`

  in [src/constants/pointsExpansion.js](src/constants/pointsExpansion.js)

- Categories (ids/labels/colors): edit `CATEGORIES` in [src/config/categories.js](src/config/categories.js)

After changing constants, restart `npm run dev`.

## What to look at

- Main UI + exposed references: [src/App.vue](src/App.vue)
- Mapbox + deck.gl layer integration: [src/components/MapCanvas.vue](src/components/MapCanvas.vue)
- Deterministic generation script: [scripts/generate-seed-points.mjs](scripts/generate-seed-points.mjs)
- Normalization + deterministic derivation: [src/data/normalizePoints.js](src/data/normalizePoints.js)
- Scale-up expansion: [src/data/pointsExpansion.js](src/data/pointsExpansion.js)

## Instrumentation hooks (required)

The app exposes stable references for objective performance checks:

- `window.__MASS_POINTS_EXPLORER__.points` → the **stable base dataset array**
- `window.__MASS_POINTS_EXPLORER__.layer` → the **stable MapboxLayer wrapper**

Additionally, the main Vue component exposes `points` and `layer` via `defineExpose()` in [src/App.vue](src/App.vue).

## Tests

Run unit/instrumentation tests:

```bash
npm run test:run
```

## What the tests validate (constraints coverage)

- [src/data/**tests**/normalizePoints.test.js](src/data/__tests__/normalizePoints.test.js)
  - validates deterministic derivation of missing fields during normalization
- [src/data/**tests**/filterCorrectness.test.js](src/data/__tests__/filterCorrectness.test.js)
  - validates combined filter logic (value range + category) is correct
- [src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js)
  - validates no CPU filtering (`Array.prototype.filter` / `Array.prototype.map`) during filter updates
  - validates stable dataset reference across repeated filter updates
  - validates stable layer instance across repeated filter updates
  - validates scrubbing only updates lightweight layer props (`filterRange` / `filterCategories`)

The tests cover:

- deterministic normalization/derivation
- filter correctness (CPU predicate mirroring the GPU filter intent)
- architectural constraints via instrumentation (no CPU `Array.prototype.filter/map` during filter updates, stable dataset reference, stable layer wrapper)

## Scaling

The default target point count is set to 250,000 in [src/constants/geo.js](src/constants/geo.js). You can reduce it for slower machines.
