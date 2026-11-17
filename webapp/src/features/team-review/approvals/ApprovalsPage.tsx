import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { errorMessageOf } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { UserLabel } from '@/shared/users';
import { Container, EmptyState, Grid, Inline, ListRow, ListRows, LoadingState, PageHeader, Stack, Stat, Text } from '@/shared/ui';

import { ApprovalDetail } from './ApprovalDetail';
import type { ApprovalItem, ApprovalKind } from './approvalItems';
import { usePendingApprovals } from './useApprovals';

const GROUPS: readonly { readonly kind: ApprovalKind; readonly title: TranslationKey }[] = [
	{ kind: 'new', title: 'teamReview.approvals.request.sectionTitle' },
	{ kind: 'edit', title: 'teamReview.approvals.change.sectionTitle' },
	{ kind: 'delete', title: 'teamReview.approvals.delete.cardTitle' },
];

/**
 * ApprovalsPage is the approver's queue: pick a request on the left, decide it on the right.
 */
export function ApprovalsPage(): ReactElement {
	const { t, formatDate } = useI18n();
	const approvals = usePendingApprovals();
	const [selectedKey, setSelectedKey] = useState('');

	const selected = approvals.items.find(item => item.key === selectedKey) ?? approvals.items[0];
	const newCount = approvals.items.filter(item => item.kind === 'new').length;
	const editCount = approvals.items.filter(item => item.kind === 'edit').length;

	return (
		<Container width="wide">
			<PageHeader
				eyebrow={t('workspace.nav.teamReview.label')}
				title={t('teamReview.sections.approvals.label')}
				description={t('teamReview.approvals.panel.description')}
			/>

			{approvals.isPending ? (
				<LoadingState title={t('teamReview.approvals.loading')} />
			) : approvals.error !== null ? (
				<EmptyState
					title={t('teamReview.approvals.empty.error.title')}
					description={errorMessageOf(approvals.error, t('teamReview.approvals.empty.error.description'))}
				/>
			) : selected === undefined ? (
				<EmptyState
					icon={CheckCircle2}
					title={t('teamReview.approvals.empty.queue.title')}
					description={t('teamReview.approvals.empty.queue.description')}
				/>
			) : (
				<>
					<Inline gap={10}>
						<Stat label={t('teamReview.approvals.summary.pending')} value={newCount} emphasis={newCount > 0} />
						<Stat label={t('teamReview.approvals.summary.editRequests')} value={editCount} />
					</Inline>
					<Grid columns={2} gap={10} align="start">
						<Stack gap={6}>
							{GROUPS.map(group => {
								const items = approvals.items.filter(item => item.kind === group.kind);

								return items.length === 0 ? null : (
									<Stack key={group.kind} gap={2}>
										<Text uppercase tone="muted">
											{t(group.title)}
										</Text>
										<ListRows label={t(group.title)}>
											{items.map(item => (
												<ListRow
													key={item.key}
													selected={item.key === selected.key}
													onSelect={() => setSelectedKey(item.key)}
													title={<UserLabel userID={item.userID} />}
													subtitle={describe(item, t, formatDate)}
												/>
											))}
										</ListRows>
									</Stack>
								);
							})}
						</Stack>
						<ApprovalDetail key={selected.key} item={selected} />
					</Grid>
				</>
			)}
		</Container>
	);
}

/**
 * describe is the one-line summary under a person in the queue.
 */
function describe(item: ApprovalItem, t: ReturnType<typeof useI18n>['t'], formatDate: (value: string) => string): string {
	if (item.kind === 'edit') {
		return t('teamReview.approvals.change.status');
	}

	if (item.kind === 'delete') {
		return t('teamReview.approvals.delete.status');
	}

	return item.startDate === item.endDate ? formatDate(item.startDate) : `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`;
}
