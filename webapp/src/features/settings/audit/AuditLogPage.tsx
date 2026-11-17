import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { listAuditLog } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { sortByNewest } from '@/shared/lib/sort';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import { UserName } from '@/shared/users';
import {
	Button,
	Container,
	DescriptionList,
	Inline,
	ListRow,
	ListRows,
	PageHeader,
	QueryView,
	Section,
	Select,
	Tag,
	Text,
} from '@/shared/ui';

import { auditLabel } from './auditLabels';

const LIMITS = ['25', '50', '100', '200'] as const;

/**
 * AuditLogPage lists the latest recorded workspace actions, newest first.
 */
export function AuditLogPage(): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const workspaceID = useWorkspaceID();
	const [limit, setLimit] = useState<string>('50');

	const audit = useQuery({
		queryKey: workspaceKey(workspaceID, 'audit', limit),
		queryFn: async () => sortByNewest((await listAuditLog(workspaceID, Number(limit))).entries, entry => entry.createdAt),
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.audit.page.eyebrow')}
				title={t('settings.audit.page.title')}
				description={t('settings.audit.page.description')}
				actions={
					<Inline gap={2}>
						<Select
							width="auto"
							label={t('settings.audit.controls.rows')}
							value={limit}
							onChange={setLimit}
							options={LIMITS.map(value => ({ value, label: t('settings.audit.controls.lastRows', { limit: value }) }))}
						/>
						<Button variant="secondary" icon={RefreshCw} loading={audit.isFetching} onClick={() => void audit.refetch()}>
							{t('settings.audit.controls.reload')}
						</Button>
					</Inline>
				}
			/>
			<QueryView
				query={audit}
				loadingTitle={t('settings.audit.loading')}
				errorTitle={t('settings.audit.error.load')}
				isEmpty={entries => entries.length === 0}
				empty={{ title: t('settings.audit.entries.empty.title'), description: t('settings.audit.entries.empty.description') }}
			>
				{entries => (
					<Section divided eyebrow={t('settings.audit.entries.eyebrow')} title={t('settings.audit.entries.title')}>
						<ListRows label={t('settings.audit.entries.title')}>
							{entries.map(entry => (
								<ListRow
									key={entry.id}
									title={auditLabel(entry.action, t)}
									subtitle={
										<Inline gap={2} wrap>
											<span>{t('settings.audit.entry.actor', { actor: '' })}</span>
											<UserName userID={entry.actorUserId} />
											<span>· {formatTimestamp(entry.createdAt)}</span>
										</Inline>
									}
									detail={
										Object.keys(entry.metadata).length === 0 ? undefined : (
											<DescriptionList
												items={Object.entries(entry.metadata).map(([key, value]) => ({
													term: auditLabel(key, t),
													detail: <span dir="auto">{value}</span>,
												}))}
											/>
										)
									}
									trailing={
										<>
											<Tag>{auditLabel(entry.entityType, t)}</Tag>
											<Text size="xs" tone="muted">
												<code dir="ltr">{entry.id.slice(0, 10)}</code>
											</Text>
										</>
									}
								/>
							))}
						</ListRows>
					</Section>
				)}
			</QueryView>
		</Container>
	);
}
