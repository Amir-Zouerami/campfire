import type { ReportKind, StandupSchedule, StandupTemplate } from '@/types/domain';

/**
 * StandupScheduleLabel is the readable schedule context shown by settings pages.
 */
export type StandupScheduleLabel = {
	readonly scheduleId: string;
	readonly templateName: string;
	readonly kindLabel: string;
	readonly timeOfDay: string;
	readonly enabledLabel: string;
	readonly title: string;
	readonly subtitle: string;
	readonly chips: readonly string[];
	readonly unavailable: boolean;
};

/**
 * StandupScheduleLabelLookup stores readable labels by schedule ID.
 */
export type StandupScheduleLabelLookup = Readonly<Record<string, StandupScheduleLabel>>;

/**
 * buildStandupScheduleLabelLookup builds readable labels for schedule-linked settings.
 */
export function buildStandupScheduleLabelLookup(
	templates: readonly StandupTemplate[],
	schedules: readonly StandupSchedule[],
): StandupScheduleLabelLookup {
	const templatesByID = new Map(templates.map(template => [template.id, template]));
	const lookup: Record<string, StandupScheduleLabel> = {};

	for (const schedule of schedules) {
		const template = templatesByID.get(schedule.templateId) ?? null;
		const templateName = template?.name.trim() || 'Unknown template';
		const kindLabel = formatScheduleKind(schedule.kind);
		const enabledLabel = schedule.enabled ? 'Enabled' : 'Disabled';

		lookup[schedule.id] = {
			scheduleId: schedule.id,
			templateName,
			kindLabel,
			timeOfDay: schedule.timeOfDay,
			enabledLabel,
			title: templateName,
			subtitle: `${kindLabel} schedule for ${templateName}`,
			chips: [kindLabel, `Report time: ${schedule.timeOfDay}`, enabledLabel, `Template: ${templateName}`],
			unavailable: false,
		};
	}

	return lookup;
}

/**
 * scheduleLabelForRule returns a readable label for a schedule-linked rule.
 */
export function scheduleLabelForRule(lookup: StandupScheduleLabelLookup, scheduleId: string): StandupScheduleLabel {
	const label = lookup[scheduleId];

	if (label !== undefined) {
		return label;
	}

	return {
		scheduleId,
		templateName: 'Unknown schedule',
		kindLabel: 'Unknown',
		timeOfDay: 'Unknown time',
		enabledLabel: 'Unavailable',
		title: 'Unknown schedule',
		subtitle: 'This rule is linked to a schedule that is not in the current standup configuration.',
		chips: ['Missing schedule'],
		unavailable: true,
	};
}

/**
 * reminderRuleTitle returns the readable reminder card title.
 */
export function reminderRuleTitle(label: StandupScheduleLabel): string {
	if (label.unavailable) {
		return 'Unlinked reminders';
	}

	return `${label.templateName} reminders`;
}

/**
 * reportRuleTitle returns the readable report-rule card title.
 */
export function reportRuleTitle(label: StandupScheduleLabel, reportKind: ReportKind): string {
	if (label.unavailable) {
		return `${formatReportKindLabel(reportKind)} report`;
	}

	return `${label.templateName} ${formatReportKindLabel(reportKind).toLowerCase()} report`;
}

/**
 * formatScheduleKind returns a readable standup schedule kind.
 */
function formatScheduleKind(value: string): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * formatReportKindLabel returns a readable report kind.
 */
function formatReportKindLabel(value: ReportKind): string {
	return value
		.split('_')
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
