# project name: Mass Points Explorer (Vue, JS, Mapbox, deck.gl)

# What We Are Building

A Vue 3 single-page application that displays a large number of geographic points (50k–250k), renders them on a Mapbox map using deck.gl, supports interactive filters that can be adjusted continuously (scrubbing), and hides or shows points instantly without expensive reprocessing.

# Required Deliverables

- Tests (unit and/or instrumentation)
- README.md with setup instructions
- package.json and lockfile

These files should be the last things committed, after the code is complete. Focus on code first.

# Functional Requirements

## Map & Rendering

- Use Mapbox as the basemap.
- Use deck.gl to render the points on the map.
- Show a hover tooltip with at least id, category, and numeric value.
- The points must be visually distinct based on their category (for example, different colors).
- Points must be rendered efficiently to handle at least 250,000 points without significant lag.

## Data

- Load data at runtime (remote fetch or bundled asset).
- We may deterministically expand a smaller dataset to reach scale.

Each point must include:

- id - position: [lng, lat]
- value: number
- category: string

If the source data does not include these fields, derive them deterministically.

# Filtering Requirements (Critical)

Implement at least:

- a numeric range filter (value) with continuous scrubbing
- a categorical filter (category)

## Live Scrubbing Requirement

The solution must support live scrubbing, meaning the user drags a slider continuously and the map updates in real time. The implementation must remain responsive during rapid filter changes (10+ updates per second).

We will test this by rapidly adjusting filters and observing no visible lag or frame drops, smooth and immediate visual updates, and no browser freezing or stuttering.

## Performance Constraint (Hard Requirement)

Filtering must be instant during scrubbing and must satisfy all four constraints:

1. _Do NOT_ rebuild a filtered data array on every interaction. The full dataset must not be filtered or mapped per update, and no new arrays may be created on each filter change.
2. _Do NOT_ recreate the deck.gl layer on every interaction. The layer instance must remain stable and reused rather than destroyed and recreated.
3. The main dataset reference must remain stable after load. The underlying data array must not change identity, and filter changes must not mutate or replace the base dataset.
4. Filter changes must be applied incrementally (lightweight updates). Use deck.gl update mechanisms efficiently so updates trigger minimal recomputation.

Performance Target: Each filter update should complete in under 100 ms, even with 250k points and rapid scrubbing.

# Testing Expectations

Provide tests that cover:

- data normalization and derivation
- filter correctness, meaning points shown or hidden match filter criteria
- at least three architectural constraints from the four listed above

The tests should verify constraints through instrumentation, not timing.
Examples of good tests include asserting data reference stability using strict equality checks, counting layer creation events to verify no recreation, monitoring array allocations during filter updates, and verifying no CPU filtering via a spy or mock on Array.prototype.filter.
Avoid timing-based tests such as asserting a filter update completes in a fixed number of milliseconds.
Make your tests robust and reliable, and test many edge cases.

# Mapbox Token (Provided)

- A Mapbox access token will be provided as part of this project, it should be included in a .env file (It already exists)
- Use the provided token only for the purpose of completing this project.

## Usage Requirements

- Read the token from an environment variable (for example VITE_MAPBOX_TOKEN).
- A .env.example file showing the expected variable name exists.
- We will not commit the actual token to source control.

## Scope Clarification

- We will not need to create our own Mapbox account.
- We will not need to manage token permissions, scopes, or billing.
- We will not need to use advanced Mapbox APIs such as tiles, uploads, or datasets.

The token is provided solely to enable the basemap for this project. Token management sophistication is not part of the project.

# Code Structure Requirements

Our main component must expose either a data reference accessible as points, data, or layerData, and a layer reference accessible as layer or layers[0], or document in README.md how readers can access the data and layer references for instrumentation.
This requirement exists solely to enable objective performance testing. You have full flexibility in your internal architecture.

# Common Pitfalls to Avoid

Common issues include CPU filtering by rebuilding arrays on every render, recreating layers on each update, missing validation of constraints, failing to test live scrubbing behavior, and relying on timing-based tests instead of instrumentation.
Be sure to avoid these, and be careful to follow the instructions carefully.

# Programming specific requests

- The program should support further expansions in the future, therefore we need to support easily adding more point categories.
- Avoid using "magic numbers", make a constants file, and declare constants like MIN_LATITUDE, MAX_LATITUDE, etc.
- Avoid using hardcoded values for categories, instead, make a configuration file or constants file to declare categories.
- Name variables and functions clearly to reflect their purpose, without abbreviations that may confuse future readers.
- We will make a separated script for generating points deteministicly, to fill the seed-points.json with values, let's say, 500 points. The script should produce the same points with the same values and categorization every time, and override the existing data (so that we don't get duplications if we run it again).
  To test the case where source data does not include these fields and we derive them deterministically, lets obfuscate some fields on purpose in order to test the process of completing these outselves (again, should be deterministic).
