# Mass Points Explorer (Vue + Mapbox + deck.gl)

A Vue 3 single-page app that renders **50k–250k** geographic points on a Mapbox basemap using deck.gl, with **live (10+ Hz) slider scrubbing** and instant category filtering.

## Setup

1. Install deps

```bash
npm install
```

2. Ensure Mapbox token exists

- Create `.env` with:

```bash
VITE_MAPBOX_TOKEN=...your token...
```

(`.env.example` documents the expected variable name.)

3. Generate deterministic seed data

```bash
npm run generate:seed
```

4. Run the app

```bash
npm run dev
```

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

The tests cover:

- deterministic normalization/derivation
- filter correctness (CPU predicate mirroring the GPU filter intent)
- architectural constraints via instrumentation (no CPU `Array.prototype.filter/map` during filter updates, stable dataset reference, stable layer wrapper)

## Scaling

The default target point count is set to 250,000 in [src/constants/geo.js](src/constants/geo.js). You can reduce it for slower machines.
