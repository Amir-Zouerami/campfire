/**
 * BatchLoader coalesces many `load(key)` calls made in the same moment into one request.
 */
export type BatchLoader<Key extends string, Value> = {
	readonly load: (key: Key) => Promise<Value | undefined>;
};

type Pending<Key extends string, Value> = {
	readonly resolve: (value: Value | undefined) => void;
	readonly reject: (error: unknown) => void;
	readonly key: Key;
};

/**
 * createBatchLoader batches loads that arrive within `delayMs` into a single `fetchBatch` call.
 * Pages render many user chips at once; without batching each would issue its own lookup.
 */
export function createBatchLoader<Key extends string, Value>(
	fetchBatch: (keys: readonly Key[]) => Promise<ReadonlyMap<Key, Value>>,
	delayMs = 8,
): BatchLoader<Key, Value> {
	let queue: Pending<Key, Value>[] = [];
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function flush(): Promise<void> {
		const batch = queue;
		queue = [];
		timer = null;

		try {
			const results = await fetchBatch([...new Set(batch.map(item => item.key))]);
			for (const item of batch) {
				item.resolve(results.get(item.key));
			}
		} catch (error: unknown) {
			for (const item of batch) {
				item.reject(error);
			}
		}
	}

	return {
		load: key =>
			new Promise<Value | undefined>((resolve, reject) => {
				queue.push({ key, resolve, reject });
				timer ??= setTimeout(() => void flush(), delayMs);
			}),
	};
}
