import { afterEach } from 'vitest';

afterEach(() => {
	// Ensure tests don't leak globals between runs.
	for (const key of Object.keys(globalThis)) {
		if (key.startsWith('__MASS_POINTS_EXPLORER__')) {
			delete globalThis[key];
		}
	}
});
