import { describe, expect, it, vi } from 'vitest';

import { createBatchLoader } from './batchLoader';

describe('createBatchLoader', () => {
	it('coalesces simultaneous loads into one de-duplicated request', async () => {
		const fetchBatch = vi.fn(async (keys: readonly string[]) => new Map(keys.map(key => [key, key.toUpperCase()])));
		const loader = createBatchLoader(fetchBatch, 1);

		const results = await Promise.all([loader.load('a'), loader.load('b'), loader.load('a')]);

		expect(results).toEqual(['A', 'B', 'A']);
		expect(fetchBatch).toHaveBeenCalledTimes(1);
		expect(fetchBatch).toHaveBeenCalledWith(['a', 'b']);
	});

	it('resolves missing keys as undefined and rejects every caller on failure', async () => {
		const missing = createBatchLoader(async () => new Map<string, string>(), 1);
		await expect(missing.load('x')).resolves.toBeUndefined();

		const failing = createBatchLoader<string, string>(async () => {
			throw new Error('offline');
		}, 1);
		await expect(Promise.all([failing.load('a'), failing.load('b')])).rejects.toThrow('offline');
	});
});
