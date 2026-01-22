// Central knobs for point expansion (deterministic jitter + value drift).
// Keep these here so you can tune spread/variance without touching generation logic.

// Fixed RNG seed so expanded output is stable across reloads.
export const POINT_EXPANSION_RNG_SEED = 1337;

// Jitter applied to longitude/latitude, in degrees.
// NOTE: This is the full peak-to-peak span used in `(rng() - 0.5) * span`.
// A span of 0.02° means max absolute jitter is 0.01°.
// Roughly: 0.02° latitude ≈ 2.22 km (since ~111.32 km per 1° latitude).
export const POINT_EXPANSION_JITTER_SPAN_DEGREES = 0.05;
export const POINT_EXPANSION_JITTER_MAX_ABS_DEGREES =
	POINT_EXPANSION_JITTER_SPAN_DEGREES / 2;

// Value drift applied per expanded point.
// This is the max absolute integer drift after rounding.
// With 5, drift becomes an integer in [-5, 5].
// With 14, drift becomes an integer in [-14, 14].
export const POINT_EXPANSION_VALUE_DRIFT_MAX_ABS = 14;
