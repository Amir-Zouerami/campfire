import type { ReactElement } from 'react';
import { FileText } from 'lucide-react';

import { CampfireEmpty } from '@/app/campfire-ui';
import type { ReportRule } from '@/types/domain';

import { ReportRuleCard } from './ReportRuleCard';
import type { ReportRuleDraftPatch, ReportRuleWithDraft } from './report-rules.types';

/**
 * ReportRulesPanelProps contains report rules and edit actions.
 */
type ReportRulesPanelProps = {
	readonly rulesWithDrafts: readonly ReportRuleWithDraft[];
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
	return (
		<section className="cf:grid cf:gap-4">
			{props.rulesWithDrafts.length === 0 ? (
				<CampfireEmpty
					icon={FileText}
					title="No report rules yet"
					description="Default report rules are created when standup templates and schedules are seeded."
				/>
			) : (
				props.rulesWithDrafts.map(pair => (
					<ReportRuleCard
						key={pair.rule.id}
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
