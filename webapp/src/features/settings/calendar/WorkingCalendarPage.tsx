import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactElement } from 'react';

import {
	createWorkspaceOffDay,
	deleteWorkspaceOffDay,
	listWorkspaceOffDays,
	listWorkspaceWorkingDays,
	updateWorkspaceWorkingDays,
} from '@/shared/api';
import { orderedWeekdays, useI18n, weekdayLabel } from '@/shared/i18n';
import { workspaceKey } from '@/shared/query/keys';
import { useRefreshBootstrap } from '@/shared/query/useRefreshBootstrap';
import { useToday, useWeekStart, useWorkspaceID } from '@/shared/session';
import {
	Button,
	Container,
	ListRow,
	ListRows,
	Notice,
	OffDaysEditor,
	PageHeader,
	QueryView,
	Section,
	Stack,
	StatusText,
	toast,
	WeekdayChips,
} from '@/shared/ui';

import { sameWeekdays, toggleWeekday, WORKING_DAY_PRESETS } from './weekdays';

/**
 * WorkingCalendarPage sets the weekdays the team works and the dates the workspace skips.
 * Standups, reminders and reports all follow this calendar.
 */
export function WorkingCalendarPage(): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const today = useToday();
	const queryClient = useQueryClient();
	const refreshBootstrap = useRefreshBootstrap();
	const offDaysKey = workspaceKey(workspaceID, 'settings', 'off-days');

	const workingDays = useQuery({
		queryKey: workspaceKey(workspaceID, 'settings', 'working-days'),
		queryFn: async () =>
			(await listWorkspaceWorkingDays(workspaceID)).workingDays
				.filter(day => day.enabled)
				.map(day => day.weekday)
				.sort((first, second) => first - second),
	});
	const offDays = useQuery({ queryKey: offDaysKey, queryFn: async () => (await listWorkspaceOffDays(workspaceID)).offDays });

	const refresh = async (): Promise<void> => {
		await queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'settings') });
		await refreshBootstrap();
	};

	const createOffDay = useMutation({
		mutationFn: (input: { readonly date: string; readonly label: string }) => createWorkspaceOffDay(workspaceID, input),
		onSuccess: () => {
			toast.success(t('settings.workingCalendar.toast.offDayCreated'));

			return refresh();
		},
	});
	const removeOffDay = useMutation({
		mutationFn: (id: string) => deleteWorkspaceOffDay(workspaceID, id),
		onSuccess: () => {
			toast.success(t('settings.workingCalendar.toast.offDayDeleted'));

			return refresh();
		},
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.workingCalendar.page.eyebrow')}
				title={t('settings.workingCalendar.page.title')}
				description={t('settings.workingCalendar.page.description')}
			/>
			<QueryView query={workingDays} loadingTitle={t('settings.workingCalendar.loading')}>
				{saved => <WorkingDaysEditor key={saved.join(',')} saved={saved} onSaved={refresh} />}
			</QueryView>
			<QueryView query={offDays} loadingTitle={t('settings.workingCalendar.loading')}>
				{days => (
					<OffDaysEditor
						days={days}
						today={today}
						canEdit
						onCreate={(date, label) => createOffDay.mutateAsync({ date, label })}
						onDelete={id => removeOffDay.mutateAsync(id)}
						labels={{
							createEyebrow: t('settings.workingCalendar.offDayCreate.eyebrow'),
							createTitle: t('settings.workingCalendar.offDayCreate.title'),
							createDescription: t('settings.workingCalendar.offDayCreate.description'),
							dateLabel: t('settings.workingCalendar.offDayCreate.date'),
							nameLabel: t('settings.workingCalendar.offDayCreate.label'),
							namePlaceholder: t('settings.workingCalendar.offDayCreate.placeholder'),
							addAction: t('settings.workingCalendar.offDayCreate.action'),
							listEyebrow: t('settings.workingCalendar.offDays.eyebrow'),
							listTitle: t('settings.workingCalendar.offDays.title'),
							listDescription: t('settings.workingCalendar.offDays.description'),
							emptyTitle: t('settings.workingCalendar.offDays.empty.title'),
							emptyDescription: t('settings.workingCalendar.offDays.empty.description'),
							past: t('settings.workingCalendar.offDays.status.past'),
							upcoming: t('settings.workingCalendar.offDays.status.upcoming'),
							created: date => t('settings.workingCalendar.offDays.created', { date }),
							deleteAction: t('settings.workingCalendar.offDays.delete'),
							dateRequired: t('settings.workingCalendar.error.offDayDateRequired'),
							nameRequired: t('settings.workingCalendar.error.offDayLabelRequired'),
						}}
					/>
				)}
			</QueryView>
		</Container>
	);
}

type WorkingDaysEditorProps = {
	readonly saved: readonly number[];
	readonly onSaved: () => Promise<void>;
};

/**
 * WorkingDaysEditor edits the weekly pattern. It is keyed by the saved pattern, so a save
 * (or a refresh from elsewhere) resets the draft to what the server holds.
 */
function WorkingDaysEditor(props: WorkingDaysEditorProps): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const weekStart = useWeekStart();
	const [selected, setSelected] = useState<readonly number[]>(props.saved);
	const changed = !sameWeekdays(selected, props.saved);

	const save = useMutation({
		mutationFn: () => updateWorkspaceWorkingDays(workspaceID, { workingDays: selected }),
		onSuccess: () => {
			toast.success(t('settings.workingCalendar.toast.saved'));

			return props.onSaved();
		},
	});

	return (
		<Section
			eyebrow={t('settings.workingCalendar.rhythm.eyebrow')}
			title={t('settings.workingCalendar.rhythm.title')}
			description={t('settings.workingCalendar.rhythm.description')}
			actions={
				<StatusText kind={changed ? 'pending' : 'approved'}>
					{changed ? t('settings.workingCalendar.rhythm.unsaved') : t('settings.workingCalendar.rhythm.saved')}
				</StatusText>
			}
		>
			<Stack gap={5}>
				<ListRows label={t('settings.workingCalendar.rhythm.presets.aria')}>
					{WORKING_DAY_PRESETS.map(preset => (
						<ListRow
							key={preset.id}
							title={t(`settings.workingCalendar.preset.${preset.id}.label`)}
							subtitle={t(`settings.workingCalendar.preset.${preset.id}.description`)}
							selected={sameWeekdays(selected, preset.weekdays)}
							onSelect={() => setSelected([...preset.weekdays].sort((first, second) => first - second))}
						/>
					))}
				</ListRows>
				<WeekdayChips
					label={t('settings.workingCalendar.rhythm.days.aria')}
					days={orderedWeekdays(weekStart).map(weekday => ({
						weekday,
						label: weekdayLabel(t, weekday, 'short'),
						state: selected.includes(weekday) ? 'on' : 'inactive',
					}))}
					onToggle={weekday => setSelected(current => toggleWeekday(current, weekday))}
				/>
				{selected.length === 0 && <Notice tone="warning">{t('settings.workingCalendar.error.weekdayRequired')}</Notice>}
				<Notice title={t('settings.workingCalendar.rhythm.notice.title')}>{t('settings.workingCalendar.rhythm.notice.description')}</Notice>
				<div>
					<Button loading={save.isPending} disabled={!changed || selected.length === 0} onClick={() => save.mutate()}>
						{t('settings.workingCalendar.rhythm.save')}
					</Button>
				</div>
			</Stack>
		</Section>
	);
}
