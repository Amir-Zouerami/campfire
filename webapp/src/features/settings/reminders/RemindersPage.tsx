import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { listReminderRules, updateReminderRule } from '@/shared/api';
import { scheduleInfoFor, useStandupConfiguration } from '@/shared/data/standups';
import type { ScheduleInfo } from '@/shared/data/standups';
import { useI18n } from '@/shared/i18n';
import { workspaceKey } from '@/shared/query/keys';
import { useWorkspaceID } from '@/shared/session';
import type { ReminderRule } from '@/shared/types/domain';
import {
	Button,
	Container,
	IconButton,
	Inline,
	Notice,
	PageHeader,
	QueryView,
	Section,
	Stack,
	StatusText,
	Switch,
	TimeField,
	toast,
	Grid,
	Field,
	Text,
} from '@/shared/ui';

import { checkReminderTimes, offsetsToTimes, timesToOffsets } from './reminderTimes';

/**
 * RemindersPage configures the nudges sent to people who have not submitted a standup.
 * Each standup schedule has its own rule; submitted people and people on approved leave are skipped by the server.
 */
export function RemindersPage(): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const configuration = useStandupConfiguration({ includeInactive: true });
	const rules = useQuery({
		queryKey: workspaceKey(workspaceID, 'settings', 'reminders'),
		queryFn: async () =>
			[...(await listReminderRules(workspaceID)).reminderRules].sort((first, second) => first.scheduleId.localeCompare(second.scheduleId)),
	});

	return (
		<Container>
			<PageHeader
				eyebrow={t('settings.reminders.page.eyebrow')}
				title={t('settings.reminders.page.title')}
				description={t('settings.reminders.page.description')}
			/>
			<QueryView
				query={rules}
				loadingTitle={t('settings.reminders.loading')}
				isEmpty={list => list.length === 0}
				empty={{ title: t('settings.reminders.empty.title'), description: t('settings.reminders.empty.description') }}
			>
				{list => (
					<QueryView query={configuration} loadingTitle={t('settings.reminders.loading')}>
						{config => (
							<Stack gap={10}>
								{list.map(rule => (
									<ReminderRuleForm key={`${rule.id}:${rule.updatedAt}`} rule={rule} schedule={scheduleInfoFor(config, rule.scheduleId)} />
								))}
							</Stack>
						)}
					</QueryView>
				)}
			</QueryView>
		</Container>
	);
}

type ReminderRuleFormProps = {
	readonly rule: ReminderRule;
	readonly schedule: ScheduleInfo;
};

/**
 * ReminderRuleForm edits one rule. It is keyed by the rule's update time, so a saved or
 * refreshed rule resets the draft to what the server now holds.
 */
function ReminderRuleForm(props: ReminderRuleFormProps): ReactElement {
	const { t } = useI18n();
	const workspaceID = useWorkspaceID();
	const queryClient = useQueryClient();
	const { rule, schedule } = props;

	const [enabled, setEnabled] = useState(rule.enabled);
	const [dm, setDM] = useState(rule.dmReminderEnabled);
	const [channel, setChannel] = useState(rule.channelReminderEnabled);
	const [mention, setMention] = useState(rule.mentionMissingInChannel);
	const [times, setTimes] = useState<readonly string[]>(() => offsetsToTimes(rule.reminderOffsets, schedule.opensAt, schedule.closesAt));

	const problem = checkReminderTimes(times, schedule.opensAt, schedule.closesAt);
	const window = { openTime: schedule.opensAt, closeTime: schedule.closesAt };

	const save = useMutation({
		mutationFn: () =>
			updateReminderRule(workspaceID, rule.id, {
				enabled,
				channelReminderEnabled: channel,
				dmReminderEnabled: dm,
				mentionMissingInChannel: mention,
				reminderOffsets: timesToOffsets(times, schedule.opensAt, schedule.closesAt),
			}),
		onSuccess: () => {
			toast.success(t('settings.reminders.toast.updated'));

			return queryClient.invalidateQueries({ queryKey: workspaceKey(workspaceID, 'settings', 'reminders') });
		},
	});

	const delivery = dm && channel ? 'dmAndChannel' : dm ? 'dmOnly' : channel ? 'channelOnly' : 'none';

	return (
		<Section
			divided
			title={
				schedule.known
					? t('settings.reminders.rule.title', { templateName: schedule.templateName })
					: t('settings.reminders.rule.unlinked.title')
			}
			description={schedule.known ? t('settings.reminders.rule.description', window) : t('settings.reminders.rule.unlinked.description')}
			actions={<StatusText kind={enabled ? 'approved' : 'inactive'}>{t(`settings.reminders.delivery.${delivery}`)}</StatusText>}
		>
			<Stack gap={0}>
				<Switch
					checked={enabled}
					onChange={setEnabled}
					label={t('settings.reminders.field.enabled.label')}
					description={t('settings.reminders.field.enabled.description')}
				/>
				<Switch
					checked={dm}
					onChange={setDM}
					label={t('settings.reminders.field.dm.label')}
					description={t('settings.reminders.field.dm.description')}
				/>
				<Switch
					checked={channel}
					onChange={setChannel}
					label={t('settings.reminders.field.channel.label')}
					description={t('settings.reminders.field.channel.description')}
				/>
				<Switch
					checked={mention}
					onChange={setMention}
					disabled={!channel}
					label={t('settings.reminders.field.mentionMissing.label')}
					description={t('settings.reminders.field.mentionMissing.description')}
				/>
			</Stack>

			<Stack gap={3}>
				<Stack gap={1}>
					<Text size="xs" tone="muted" weight="bold" uppercase>
						{t('settings.reminders.time.windowKicker')}
					</Text>
					<Text weight="bold">{t('settings.reminders.time.windowTitle', window)}</Text>
				</Stack>
				<Grid columns={3}>
					{times.map((time, index) => (
						<Field key={index} label={t('settings.reminders.time.reminderLabel', { position: index + 1 })}>
							<Inline gap={2} align="center">
								<TimeField
									value={time}
									onChange={value => setTimes(current => current.map((entry, position) => (position === index ? value : entry)))}
									label={t('settings.reminders.time.reminderLabel', { position: index + 1 })}
									step={5}
								/>
								<IconButton
									icon={X}
									size="sm"
									variant="ghost"
									disabled={time === ''}
									label={t('settings.reminders.time.clearReminderAriaLabel', { position: index + 1 })}
									onClick={() => setTimes(current => current.map((entry, position) => (position === index ? '' : entry)))}
								/>
							</Inline>
						</Field>
					))}
				</Grid>
				{problem !== 'none' && (
					<Notice tone={problem === 'partialSave' ? 'warning' : 'danger'}>{t(`settings.reminders.validation.${problem}`, window)}</Notice>
				)}
			</Stack>

			<div>
				<Button loading={save.isPending} disabled={problem === 'chooseOne' || problem === 'insideWindow'} onClick={() => save.mutate()}>
					{t('settings.reminders.action.save')}
				</Button>
			</div>
		</Section>
	);
}
