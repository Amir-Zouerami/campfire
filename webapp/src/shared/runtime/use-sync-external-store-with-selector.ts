import { useMemo, useRef, useSyncExternalStore } from 'react';

/**
 * ESM replacement for `use-sync-external-store/shim/with-selector`, built on React 19's native
 * `useSyncExternalStore`. It memoizes the selected value so a store update that does not change
 * the selection never re-renders the component.
 */
export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
	subscribe: (onStoreChange: () => void) => () => void,
	getSnapshot: () => Snapshot,
	getServerSnapshot: undefined | null | (() => Snapshot),
	selector: (snapshot: Snapshot) => Selection,
	isEqual?: (first: Selection, second: Selection) => boolean,
): Selection {
	const last = useRef<{ readonly snapshot: Snapshot; readonly selection: Selection } | null>(null);

	const getSelection = useMemo(() => {
		return (): Selection => {
			const snapshot = getSnapshot();
			const previous = last.current;

			if (previous !== null && Object.is(previous.snapshot, snapshot)) {
				return previous.selection;
			}

			const selection = selector(snapshot);
			if (previous !== null && isEqual?.(previous.selection, selection) === true) {
				last.current = { snapshot, selection: previous.selection };

				return previous.selection;
			}

			last.current = { snapshot, selection };

			return selection;
		};
	}, [getSnapshot, selector, isEqual]);

	return useSyncExternalStore(
		subscribe,
		getSelection,
		getServerSnapshot === undefined || getServerSnapshot === null ? undefined : () => selector(getServerSnapshot()),
	);
}
