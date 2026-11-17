import { errorMessageOf } from '@/shared/api';
import type { TFunction } from '@/shared/i18n';

/**
 * REPORT_ERRORS maps the server's English eligibility messages to translated ones. The server
 * reports "this report cannot be generated" in prose; matching it here keeps those messages
 * in the user's language without changing the backend contract.
 */
const REPORT_ERRORS: readonly { readonly matches: (message: string) => boolean; readonly key: Parameters<TFunction>[0] }[] = [
	{
		matches: message => message.startsWith('No daily standup was active for this workspace on '),
		key: 'reports.preview.error.noDailyStandup',
	},
	{
		matches: message => message.startsWith('No weekly standup was active for this workspace on '),
		key: 'reports.preview.error.noWeeklyStandupDate',
	},
	{
		matches: message => message === 'No weekly standup was active in the selected period.',
		key: 'reports.preview.error.noWeeklyStandupPeriod',
	},
	{
		matches: message => message === 'The enabled daily report rule is not connected to an active daily standup schedule for this date.',
		key: 'reports.preview.error.dailyRuleDisconnected',
	},
	{
		matches: message => message === 'The enabled weekly report rule is not connected to an active weekly standup schedule for this period.',
		key: 'reports.preview.error.weeklyRuleDisconnected',
	},
	{
		matches: message => message === 'The enabled report rule is not connected to an active standup schedule.',
		key: 'reports.preview.error.reportRuleDisconnected',
	},
];

/**
 * reportErrorMessage turns a failed report request into a translated message.
 */
export function reportErrorMessage(error: unknown, t: TFunction): string {
	const message = errorMessageOf(error, t('reports.preview.error.fallback'));
	const known = REPORT_ERRORS.find(entry => entry.matches(message));

	return known === undefined ? message : t(known.key);
}
