# Notes / Reflection

## Learning journey

I started this assignment thinking “filtering 250k points” meant I needed to optimize JavaScript filtering.

The biggest conceptual shift for me was realizing that for live scrubbing, any CPU work proportional to the dataset size (like `data.filter(...)` or rebuilding attributes) is going to show up as stutter. deck.gl’s extension model made it clear that I should treat filtering as a shader/uniform update problem rather than a JavaScript list transformation problem.

Mapbox + deck.gl integration was initially confusing because there are multiple integration styles (overlay vs custom layer). I learned that the “custom layer” approach is ideal when I want a stable object to update incrementally.

## Validation process

I validated constraints with instrumentation-style tests, and I named them after the guarantees they protect.

- [src/data/**tests**/normalizePoints.test.js](src/data/__tests__/normalizePoints.test.js) protects against accidental nondeterminism in derived fields (id/value/category) when seed rows are missing some fields.
- [src/data/**tests**/filterCorrectness.test.js](src/data/__tests__/filterCorrectness.test.js) protects against logical mistakes in combined filtering (value range + category), e.g. “category toggles don’t actually hide points”.
- [src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js) protects against performance regressions by asserting:
  - filter updates do not call `Array.prototype.filter` / `Array.prototype.map`
  - the base dataset array reference stays stable across repeated updates
  - the layer instance stays stable (no recreations)
  - scrubbing only changes lightweight layer props (filterRange/filterCategories)

I intentionally avoided timing assertions because I don’t want flaky tests that vary by machine.

## Design evolution

My first attempt used the newest versions of the Mapbox integration package and I discovered that the root export no longer exposed the custom layer wrapper I wanted to reference directly. I ended up solving this by adding a Vite alias that points to the internal `mapbox-layer` module, so I could keep a stable layer wrapper while still using the newer filtering features.

Once I committed to that integration shape, the architecture got simpler: one stable dataset, one stable layer wrapper, and filter updates implemented as prop updates.

## Known limitations

- The current category selection is small and UI-focused; a very large number of categories would need a different UI (search, grouping, etc.).
- The tooltip is basic; I would improve formatting and add more fields if the data grows.
- The expansion logic is intentionally simple (jitter + drift). For real data I would load a real dataset or use a more domain-appropriate expansion strategy.

## AI usage reflection

You (the AI) were most useful when I needed:

- a fast way to cross-check deck.gl extension APIs and how category filtering works
- a sanity check on how to interpret the constraints and how to test them without timing

Where AI guidance was weaker was around version/packaging details of the mapbox integration; the “correct” import surface changed between major versions, and I had to validate it by actually running a production build.

If I repeated this, I would start by validating the exact integration API in a minimal spike project before wiring the full app.
