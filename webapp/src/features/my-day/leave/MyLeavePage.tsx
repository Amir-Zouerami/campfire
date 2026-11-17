import type { ReactElement } from 'react';

import { useLeaveTypes } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import { Container, LoadingState, PageHeader, QueryView, Section } from '@/shared/ui';

import { ActiveLeaveList } from './ActiveLeaveList';
import { NewLeaveRequest } from './NewLeaveRequest';
import { useMyActiveLeaves } from './useLeaveActions';

/**
 * MyLeavePage lets a member request leave and manage their own pending and approved requests.
 */
export function MyLeavePage(): ReactElement {
	const { t } = useI18n();
	const types = useLeaveTypes();
	const mine = useMyActiveLeaves();

	return (
		<Container>
			<PageHeader
				eyebrow={t('myDay.leave.page.eyebrow')}
				title={t('myDay.leave.page.title')}
				description={t('myDay.leave.page.description')}
			/>

			{types.isPending || mine.isPending ? (
				<LoadingState title={t('myDay.leave.loading')} />
			) : (
				<QueryView query={types}>
					{leaveTypes => (
						<QueryView query={mine}>
							{leaves => (
								<>
									<Section divided eyebrow={t('myDay.leave.active.eyebrow')} title={t('myDay.leave.active.title')}>
										<ActiveLeaveList leaves={leaves} leaveTypes={leaveTypes} />
									</Section>
									<Section divided eyebrow={t('myDay.leave.request.eyebrow')} title={t('myDay.leave.request.title')}>
										<NewLeaveRequest leaveTypes={leaveTypes} activeLeaves={leaves} />
									</Section>
								</>
							)}
						</QueryView>
					)}
				</QueryView>
			)}
		</Container>
	);
}
