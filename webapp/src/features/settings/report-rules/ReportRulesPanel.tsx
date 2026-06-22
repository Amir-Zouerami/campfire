import type { ReactElement } from 'react';
import { FileText } from 'lucide-react';

import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { useI18n } from '@/i18n';
import { scheduleLabelForRule, type StandupScheduleLabelLookup } from '@/features/settings/standup-schedule-labels';
import type { ReportRule } from '@/types/domain';

import { ReportRuleCard } from './ReportRuleCard';
import type { ReportRuleDraftPatch, ReportRuleWithDraft } from './report-rules.types';

/**
 * ReportRulesPanelProps contains report rules and edit actions.
 */
type ReportRulesPanelProps = {
	readonly rulesWithDrafts: readonly ReportRuleWithDraft[];
	readonly scheduleLabels: StandupScheduleLabelLookup;
	readonly disabled: boolean;
	readonly canManageReportRules: boolean;
	readonly savingRuleID: string;
	readonly onDraftChange: (ruleID: string, patch: ReportRuleDraftPatch) => void;
	readonly onSave: (rule: ReportRule) => Promise<void>;
};

/**
 * ReportRulesPanel renders all editable report rules.
 */
export function ReportRulesPanel(props: ReportRulesPanelProps): ReactElement {
	const { t } = useI18n();

	return (
		<section className="campfire-settings-rule-list">
			{props.rulesWithDrafts.length === 0 ? (
				<CampfireEmpty
					icon={FileText}
					title={t('settings.reportRules.empty.title')}
					description={t('settings.reportRules.empty.description')}
				/>
			) : (
				props.rulesWithDrafts.map(pair => (
					<ReportRuleCard
						key={pair.rule.id}
						scheduleLabel={scheduleLabelForRule(props.scheduleLabels, pair.rule.scheduleId)}
						rule={pair.rule}
						draft={pair.draft}
						disabled={props.disabled}
						canManageReportRules={props.canManageReportRules}
						saving={props.savingRuleID === pair.rule.id}
						onDraftChange={props.onDraftChange}
						onSave={props.onSave}
					/>
				))
			)}
		</section>
	);
}
