import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { leaveDurationText, leaveRangeText, leaveTypeName } from '@/shared/data/leave';
import { useI18n } from '@/shared/i18n';
import { weekRangeOf } from '@/shared/lib/date';
import type { DateRange } from '@/shared/lib/date';
import { useToday, useWeekStart, useWorkspaceSession } from '@/shared/session';
import { UserLabel, UserName } from '@/shared/users';
import {
	Button,
	ConfirmDialog,
	Container,
	DateField,
	EmptyState,
	Field,
	Grid,
	IconButton,
	Inline,
	ListRow,
	ListRows,
	LoadingState,
	Notice,
	PageHeader,
	Section,
	Stat,
	Tag,
	WeekGrid,
} from '@/shared/ui';
import type { ApprovedLeaveRequest } from '@/shared/types/domain';

import { defaultRange, isValidRange, leavesInRange, leavesOnDate, weekGridDays, weekGridRows } from './availability';
import { CorrectLeaveDialog } from './CorrectLeaveDialog';
import { useApprovedLeave, useLeaveCorrections } from './useTeamAvailability';

/**
 * AvailabilityPage shows who is out today and this week, and lists approved leave in a planning window.
 */
export function AvailabilityPage(): ReactElement {
	const { t, locale, formatTimestamp } = useI18n();
	const { workspace } = useWorkspaceSession();
	const today = useToday();
	const week = weekRangeOf(today, useWeekStart());
	const [range, setRange] = useState<DateRange>(() => defaultRange(today));
	const [correcting, setCorrecting] = useState<ApprovedLeaveRequest | null>(null);
	const [removing, setRemoving] = useState<ApprovedLeaveRequest | null>(null);
	const weekLeaves = useApprovedLeave(week);
	const rangeLeaves = useApprovedLeave(range);
	const { remove } = useLeaveCorrections();
	const valid = isValidRange(range);

	const thisWeek = weekLeaves.data ?? [];
	const outToday = leavesOnDate(thisWeek, today);
	const inRange = rangeLeaves.data ?? [];
	const people = new Set(inRange.map(item => item.leaveRequest.userId)).size;

	return (
		<Container>
			<PageHeader
				eyebrow={t('workspace.nav.teamReview.label')}
				title={t('teamReview.sections.availability.label')}
				description={t('teamReview.sections.availability.description')}
			/>

			<Inline gap={10} wrap>
				<Stat
					label={t('teamReview.availability.summary.today')}
					value={outToday.length}
					caption={t('teamReview.availability.panel.todayDescription')}
				/>
				<Stat
					label={t('teamReview.availability.summary.thisWeek')}
					value={leavesInRange(thisWeek, week).length}
					caption={t('teamReview.availability.panel.weekDescription')}
				/>
				<Stat label={t('teamReview.availability.summary.selectedRange')} value={valid ? inRange.length : '—'} />
				<Stat label={t('teamReview.availability.summary.profiles')} value={valid ? people : '—'} />
			</Inline>

			<Section
				divided
				title={t('teamReview.availability.summary.thisWeek')}
				description={t('teamReview.availability.panel.weekDescription')}
			>
				{weekLeaves.isPending ? (
					<LoadingState title={t('teamReview.availability.loading')} />
				) : thisWeek.length === 0 ? (
					<EmptyState
						title={t('teamReview.availability.empty.summary.title')}
						description={t('teamReview.availability.empty.summary.description')}
					/>
				) : (
					<WeekGrid
						caption={t('teamReview.availability.summary.thisWeek')}
						days={weekGridDays(week, workspace.workingDays, today, locale)}
						rows={weekGridRows(
							thisWeek,
							week,
							userID => (
								<UserLabel userID={userID} size="xs" />
							),
							item => leaveTypeName(t, { name: item.leaveTypeName }),
						)}
					/>
				)}
			</Section>

			<Section
				divided
				eyebrow={t('teamReview.availability.table.eyebrow')}
				title={t('teamReview.availability.table.title')}
				description={t('teamReview.availability.controls.description')}
			>
				<Grid columns={2}>
					<Field label={t('teamReview.availability.field.startDate')}>
						<DateField value={range.startDate} onChange={startDate => setRange(current => ({ ...current, startDate }))} />
					</Field>
					<Field label={t('teamReview.availability.field.endDate')}>
						<DateField value={range.endDate} onChange={endDate => setRange(current => ({ ...current, endDate }))} />
					</Field>
				</Grid>

				{!valid ? (
					<Notice tone="warning">{t('teamReview.availability.validation.validRange')}</Notice>
				) : rangeLeaves.isPending ? (
					<LoadingState title={t('teamReview.availability.loading')} />
				) : inRange.length === 0 ? (
					<EmptyState
						title={t('teamReview.availability.empty.range.title')}
						description={t('teamReview.availability.empty.range.description')}
					/>
				) : (
					<ListRows label={t('teamReview.availability.table.title')}>
						{inRange.map(item => (
							<ListRow
								key={item.leaveRequest.id}
								title={<UserLabel userID={item.leaveRequest.userId} />}
								subtitle={`${leaveTypeName(t, { name: item.leaveTypeName })} · ${leaveRangeText(item.leaveRequest)} · ${leaveDurationText(t, item.leaveRequest)}`}
								detail={
									<>
										{item.leaveRequest.backupUserId !== '' && (
											<>
												{t('myDay.leave.meta.backup')}: <UserName userID={item.leaveRequest.backupUserId} />
												{' · '}
											</>
										)}
										{t('teamReview.availability.meta.created')} {formatTimestamp(item.leaveRequest.createdAt, workspace.timezone)}
									</>
								}
								trailing={
									<>
										<Tag tone="blue">{t('myDay.leave.status.approved')}</Tag>
										<Button size="sm" variant="secondary" onClick={() => setCorrecting(item)}>
											{t('teamReview.availability.edit.open')}
										</Button>
										<IconButton icon={Trash2} variant="ghost" label={t('common.delete')} onClick={() => setRemoving(item)} />
									</>
								}
							/>
						))}
					</ListRows>
				)}
			</Section>

			{correcting !== null && (
				<CorrectLeaveDialog key={correcting.leaveRequest.id} leave={correcting} onClose={() => setCorrecting(null)} />
			)}
			<ConfirmDialog
				open={removing !== null}
				title={t('common.delete')}
				description={t('teamReview.availability.confirm.remove')}
				confirmLabel={t('common.delete')}
				tone="danger"
				loading={remove.isPending}
				onCancel={() => setRemoving(null)}
				onConfirm={() => {
					if (removing !== null) {
						remove.mutate(removing.leaveRequest.id);
					}

					setRemoving(null);
				}}
			/>
		</Container>
	);
}
