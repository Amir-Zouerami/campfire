import type { ReactElement } from 'react';
import { FileText, Save } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { reportRuleTitle, type StandupScheduleLabel } from '@/features/settings/standup-schedule-labels';
import { Button } from '@/components/ui/button';
import type { ReportRule } from '@/types/domain';

import {
	formatDateTime,
	formatReportKind,
	formatReportLanguage,
	formatReportSortMode,
	reportLanguageOptions,
	reportRuleCardClassName,
	reportRuleHasChanges,
	reportSortOptions,
	toReportLanguage,
	toReportSortMode,
} from './report-rules.helpers';
import type { ReportRuleDraft, ReportRuleDraftPatch } from './report-rules.types';
import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * ReportRuleCardProps contains one report rule and its editable draft.
 */
type ReportRuleCardProps = {
	readonly scheduleLabel: StandupScheduleLabel;
	readonly rule: ReportRule;
	readonly draft: ReportRuleDraft;
	readonly disabled: boolean;
	readonly canManageReportRules: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (ruleID: string, patch: ReportRuleDraftPatch) => void;
	readonly onSave: (rule: ReportRule) => Promise<void>;
};

/**
 * ReportRuleCard renders one editable scheduled report rule.
 */
export function ReportRuleCard(props: ReportRuleCardProps): ReactElement {
	const changed = reportRuleHasChanges(props.rule, props.draft);
	const formDisabled = props.disabled || !props.canManageReportRules;
	const reportKindLabel = formatReportKind(props.rule.reportKind);

	return (
		<article className={reportRuleCardClassName(props.draft.enabled)}>
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:flex cf:flex-wrap cf:items-center cf:gap-2 cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<FileText className="cf:size-5" />
						{reportKindLabel}
					</p>

					<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
						{reportRuleTitle(props.scheduleLabel, props.rule.reportKind)}
					</h3>

					<p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
						{props.scheduleLabel.subtitle}
					</p>

					<ScheduleContextChips label={props.scheduleLabel} />

					<p className="cf:mt-3 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Updated {formatDateTime(props.rule.updatedAt)}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
						{props.draft.enabled ? 'Enabled' : 'Disabled'}
					</CampfireStatusPill>
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved' : 'Saved'}
					</CampfireStatusPill>
					{props.scheduleLabel.unavailable && (
						<CampfireStatusPill tone="red">Missing schedule</CampfireStatusPill>
					)}
				</div>
			</div>

			<div className="cf:grid cf:gap-3 cf:xl:grid-cols-2">
				<CampfireCheckboxField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label="Enable this report"
					description="Allow Campfire to generate this scheduled report."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.postToChannel}
					disabled={formDisabled}
					label="Post to channel"
					description="Automatically post the generated report to the workspace channel."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { postToChannel: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.previewRequired}
					disabled={formDisabled}
					label="Preview required"
					description="Require manual review before posting when supported by the workflow."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { previewRequired: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeMissing}
					disabled={formDisabled}
					label="Include missing users"
					description="Show users who did not submit when the report type supports it."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeMissing: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeOnLeave}
					disabled={formDisabled}
					label="Include on-leave users"
					description="Show approved leave context in generated reports."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeOnLeave: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeTime}
					disabled={formDisabled}
					label="Include time"
					description="Include time-tracking summaries when the report supports it."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeTime: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeBlockers}
					disabled={formDisabled}
					label="Include blockers"
					description="Highlight blocker-related answers and sections."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeBlockers: checked })}
				/>
			</div>

			<div className="campfire-report-rule-select-grid cf:grid cf:gap-3 cf:xl:grid-cols-2">
				<CampfireField id={`campfire-report-rule-sort-${props.rule.id}`} label="Sort mode">
					<CampfireSelect
						id={`campfire-report-rule-sort-${props.rule.id}`}
						disabled={formDisabled}
						value={props.draft.sortMode}
						onValueChange={value => props.onDraftChange(props.rule.id, { sortMode: toReportSortMode(value) })}
					>
						{reportSortOptions.map(sortMode => (
							<option key={sortMode} value={sortMode}>
								{formatReportSortMode(sortMode)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<CampfireField id={`campfire-report-rule-language-${props.rule.id}`} label="Report language">
					<CampfireSelect
						id={`campfire-report-rule-language-${props.rule.id}`}
						disabled={formDisabled}
						value={props.draft.reportLanguage}
						onValueChange={value => props.onDraftChange(props.rule.id, { reportLanguage: toReportLanguage(value) })}
					>
						{reportLanguageOptions.map(language => (
							<option key={language} value={language}>
								{formatReportLanguage(language)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
				<p className="cf:m-0 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Report rules control scheduled generation. Manual report review and posting stays in Reports.
				</p>

				<Button type="button" disabled={formDisabled || !changed} onClick={() => void props.onSave(props.rule)}>
					<Save className="cf:size-4" />
					{props.saving ? 'Saving…' : 'Save report'}
				</Button>
			</div>
		</article>
	);
}

/**
 * ScheduleContextChips renders readable schedule context.
 */
function ScheduleContextChips(props: { readonly label: StandupScheduleLabel }): ReactElement {
	return (
		<div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
			{props.label.chips.map(chip => (
				<span
					key={chip}
					className="cf:rounded-full cf:border cf:border-white/10 cf:bg-black/20 cf:px-2.5 cf:py-1 cf:text-xs cf:font-semibold cf:text-amber-100"
				>
					{chip}
				</span>
			))}
		</div>
	);
}
