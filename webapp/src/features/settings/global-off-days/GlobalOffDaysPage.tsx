import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';

import { createGlobalSkipDate, deleteGlobalSkipDate, listGlobalSkipDates } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { globalKey } from '@/shared/query/keys';
import { useToday, useWorkspaceSession } from '@/shared/session';
import { Container, Notice, OffDaysEditor, PageHeader, QueryView, toast } from '@/shared/ui';

/**
 * GlobalOffDaysPage manages organization-wide holidays that suppress standup automation in
 * every workspace. Only system admins can change them; others see the list.
 */
export function GlobalOffDaysPage(): ReactElement {
	const { t } = useI18n();
	const { isSystemAdmin } = useWorkspaceSession();
	const today = useToday();
	const queryClient = useQueryClient();
	const key = globalKey('settings', 'skip-dates');

	const dates = useQuery({ queryKey: key, queryFn: async () => (await listGlobalSkipDates()).skipDates });
	const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: key });

	const create = useMutation({
		mutationFn: (input: { readonly date: string; readonly label: string }) => createGlobalSkipDate(input),
		onSuccess: () => {
			toast.success(t('settings.globalOffDays.toast.created'));

			return refresh();
		},
	});
	const remove = useMutation({
		mutationFn: (id: string) => deleteGlobalSkipDate(id),
		onSuccess: () => {
			toast.success(t('settings.globalOffDays.toast.deleted'));

			return refresh();
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.globalOffDays.page.eyebrow')}
				title={t('settings.globalOffDays.page.title')}
				description={t('settings.globalOffDays.page.description')}
			/>
			{!isSystemAdmin && <Notice tone="info">{t('settings.globalOffDays.permission.viewOnly')}</Notice>}
			<QueryView query={dates} loadingTitle={t('settings.globalOffDays.loading')}>
				{days => (
					<OffDaysEditor
						days={days}
						today={today}
						canEdit={isSystemAdmin}
						onCreate={(date, label) => create.mutateAsync({ date, label })}
						onDelete={id => remove.mutateAsync(id)}
						labels={{
							createEyebrow: t('settings.globalOffDays.create.eyebrow'),
							createTitle: t('settings.globalOffDays.create.title'),
							createDescription: t('settings.globalOffDays.create.description'),
							dateLabel: t('settings.globalOffDays.create.date'),
							nameLabel: t('settings.globalOffDays.create.label'),
							namePlaceholder: t('settings.globalOffDays.create.placeholder'),
							addAction: t('settings.globalOffDays.create.action'),
							listEyebrow: t('settings.globalOffDays.list.eyebrow'),
							listTitle: t('settings.globalOffDays.list.title'),
							listDescription: t('settings.globalOffDays.list.description'),
							emptyTitle: t('settings.globalOffDays.empty.title'),
							emptyDescription: t('settings.globalOffDays.empty.description'),
							past: t('settings.globalOffDays.status.past'),
							upcoming: t('settings.globalOffDays.status.upcoming'),
							created: date => t('settings.globalOffDays.created', { date }),
							deleteAction: t('settings.globalOffDays.delete'),
							dateRequired: t('settings.globalOffDays.error.dateRequired'),
							nameRequired: t('settings.globalOffDays.error.labelRequired'),
						}}
					/>
				)}
			</QueryView>
		</Container>
	);
}
