import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { evaluateStandupDay } from '@/shared/api';
import { standupKeys } from '@/shared/data/standups';
import { leaveDurationText } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import { useToday, useWorkspaceID } from '@/shared/session';
import { UserLabel, UserName } from '@/shared/users';
import {
	Button,
	Container,
	DateField,
	EmptyState,
	Field,
	Inline,
	ListRow,
	ListRows,
	LoadingState,
	Notice,
	PageHeader,
	QueryView,
	Section,
	Stack,
	Stat,
	StatusText,
	Tag,
	Text,
} from '@/shared/ui';

import { decisionSignals, reasonDescription, reasonLabel } from './runtime';

/**
 * RuntimePage explains whether standup automation will run on a date, and exactly why.
 */
export function RuntimePage(): ReactElement {
	const { t, formatTimestamp } = useI18n();
	const workspaceID = useWorkspaceID();
	const today = useToday();
	const [date, setDate] = useState(today);

	const decision = useQuery({
		queryKey: standupKeys.runtime(workspaceID, date),
		queryFn: async () => (await evaluateStandupDay(workspaceID, date)).decision,
		enabled: date !== '',
		staleTime: 15_000,
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('teamReview.runtime.panel.eyebrow')}
				title={t('teamReview.runtime.panel.title')}
				description={t('teamReview.runtime.panel.description')}
			/>

			<Inline gap={3} align="end" wrap>
				<Field label={t('teamReview.runtime.controls.date.label')}>
					<DateField value={date} onChange={setDate} />
				</Field>
				<Button variant="secondary" onClick={() => setDate(today)} disabled={date === today}>
					{t('teamReview.runtime.controls.today')}
				</Button>
			</Inline>

			{date === '' ? (
				<Notice tone="warning">{t('teamReview.runtime.validation.dateRequired')}</Notice>
			) : decision.isPending ? (
				<LoadingState title={t('teamReview.runtime.loading')} />
			) : (
				<QueryView query={decision} errorTitle={t('teamReview.runtime.error.fallback')}>
					{result => (
						<>
							<Inline gap={10} wrap>
								<Stat
									label={t('teamReview.runtime.summary.decision')}
									value={result.shouldRun ? t('teamReview.runtime.decision.willRun') : t('teamReview.runtime.decision.willSkip')}
									emphasis={!result.shouldRun}
								/>
								<Stat label={t('teamReview.runtime.summary.reason')} value={reasonLabel(t, result.reason)} />
								<Stat label={t('teamReview.runtime.summary.participants')} value={result.memberCount} />
								<Stat label={t('teamReview.runtime.summary.onLeave')} value={result.onLeaveMemberCount} />
								<Stat label={t('teamReview.runtime.summary.excluded')} value={result.excludedMemberCount} />
							</Inline>

							<Section
								divided
								eyebrow={t('teamReview.runtime.message.eyebrow')}
								title={result.shouldRun ? t('teamReview.runtime.message.shouldRun') : t('teamReview.runtime.message.shouldSkip')}
							>
								<Stack gap={3}>
									<Text as="p">
										{result.message ||
											(result.shouldRun ? t('teamReview.runtime.message.runFallback') : t('teamReview.runtime.message.skipFallback'))}
									</Text>
									<Text as="p" tone="muted">
										{reasonDescription(t, result.reason)}
									</Text>
									<ListRows label={t('teamReview.runtime.message.eyebrow')}>
										{decisionSignals(t, result).map(signal => (
											<ListRow
												key={signal.label}
												title={signal.label}
												trailing={
													<StatusText kind={signal.affectsDecision ? 'attention' : 'done'}>
														{signal.affectsDecision ? t('teamReview.runtime.signal.affectsDecision') : t('teamReview.runtime.signal.clear')}
													</StatusText>
												}
											/>
										))}
									</ListRows>
								</Stack>
							</Section>

							<Section divided eyebrow={t('teamReview.runtime.offDays.eyebrow')} title={t('teamReview.runtime.offDays.title')}>
								{result.globalOffDays.length + result.workspaceOffDays.length === 0 ? (
									<EmptyState
										icon={CalendarCheck}
										title={t('teamReview.runtime.offDays.empty.title')}
										description={t('teamReview.runtime.offDays.empty.description')}
									/>
								) : (
									<ListRows label={t('teamReview.runtime.offDays.title')}>
										{[...result.globalOffDays, ...result.workspaceOffDays].map(offDay => (
											<ListRow
												key={offDay.id}
												title={offDay.label === '' ? offDay.date : offDay.label}
												subtitle={t('teamReview.runtime.offDays.created', { createdAt: formatTimestamp(offDay.createdAt) })}
												trailing={<Tag tone="flame">{t('teamReview.runtime.offDays.skipSignal')}</Tag>}
											/>
										))}
									</ListRows>
								)}
							</Section>

							<Section divided eyebrow={t('teamReview.runtime.leave.eyebrow')} title={t('teamReview.runtime.leave.title')}>
								{result.approvedLeaves.length === 0 ? (
									<EmptyState
										title={t('teamReview.runtime.leave.empty.title')}
										description={t('teamReview.runtime.leave.empty.description')}
									/>
								) : (
									<ListRows label={t('teamReview.runtime.leave.title')}>
										{result.approvedLeaves.map(item => (
											<ListRow
												key={item.leaveRequest.id}
												title={<UserLabel userID={item.leaveRequest.userId} />}
												subtitle={leaveDurationText(t, item.leaveRequest)}
												detail={
													item.leaveRequest.backupUserId === '' ? undefined : (
														<>
															{t('myDay.leave.meta.backup')}: <UserName userID={item.leaveRequest.backupUserId} />
														</>
													)
												}
												trailing={<StatusText kind="approved">{t('teamReview.runtime.leave.approved')}</StatusText>}
											/>
										))}
									</ListRows>
								)}
							</Section>
						</>
					)}
				</QueryView>
			)}
		</Container>
	);
}
