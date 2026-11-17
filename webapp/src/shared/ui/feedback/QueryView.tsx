import type { UseQueryResult } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { errorMessageOf } from '@/shared/api/errors';

import { Button } from '../primitives/Button';
import { EmptyState, LoadingState } from './states';

type QueryViewProps<Data> = {
	readonly query: UseQueryResult<Data>;
	readonly loadingTitle?: string;
	readonly errorTitle?: string;
	/** When it returns true the empty state is shown instead of children. */
	readonly isEmpty?: (data: Data) => boolean;
	readonly empty?: { readonly title: string; readonly description?: string; readonly action?: ReactNode };
	readonly children: (data: Data) => ReactNode;
};

/**
 * QueryView renders the loading, error and empty states of a query exactly once, so pages
 * only describe their happy path.
 */
export function QueryView<Data>(props: QueryViewProps<Data>): ReactElement {
	const { t } = useI18n();
	const { query } = props;

	if (query.isPending) {
		return <LoadingState title={props.loadingTitle ?? t('common.loading')} />;
	}

	if (query.isError) {
		return (
			<EmptyState
				title={props.errorTitle ?? t('common.loadFailed')}
				description={errorMessageOf(query.error, t('common.loadFailed'))}
				action={
					<Button variant="secondary" size="sm" icon={RefreshCw} loading={query.isRefetching} onClick={() => void query.refetch()}>
						{t('common.retry')}
					</Button>
				}
			/>
		);
	}

	if (props.isEmpty?.(query.data) === true && props.empty !== undefined) {
		return <EmptyState title={props.empty.title} description={props.empty.description} action={props.empty.action} />;
	}

	return <>{props.children(query.data)}</>;
}
