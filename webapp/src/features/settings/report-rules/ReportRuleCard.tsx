import type { ReactElement } from 'react';
import { FileText, Loader2, Save } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { reportRuleTitle, type StandupScheduleLabel } from '@/features/settings/standup-schedule-labels';
import type { ReportRule } from '@/types/domain';

import {
	formatDateTime,
	formatReportKind,
	formatReportLanguage,
	formatReportSortMode,
	reportLanguageOptions,
	reportRuleHasChanges,
	reportSortOptions,
	toReportLanguage,
	toReportSortMode,
} from './report-rules.helpers';
import type { ReportRuleDraft, ReportRuleDraftPatch } from './report-rules.types';

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
		<CampfireSettingsPanel
			className={props.draft.enabled ? 'campfire-rule-panel' : 'campfire-rule-panel campfire-rule-panel--disabled'}
			title={reportRuleTitle(props.scheduleLabel, props.rule.reportKind)}
			description={`${reportKindLabel}. Window ${props.scheduleLabel.opensAt}–${props.scheduleLabel.timeOfDay}.`}
			icon={FileText}
			meta={
				<div className="campfire-rule-meta-stack">
					<span>{props.draft.enabled ? 'Enabled' : 'Disabled'}</span>
					<span>{changed ? 'Unsaved changes' : 'Saved'}</span>
					<span>Updated {formatDateTime(props.rule.updatedAt)}</span>
					{props.scheduleLabel.unavailable && <span>Missing schedule</span>}
				</div>
			}
		>
			<div className="campfire-settings-choice-grid">
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
					description="Post automatically when the report is ready."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { postToChannel: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.previewRequired}
					disabled={formDisabled}
					label="Preview required"
					description="Require review before posting when supported."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { previewRequired: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeMissing}
					disabled={formDisabled}
					label="Include missing users"
					description="Show users who did not submit."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeMissing: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeOnLeave}
					disabled={formDisabled}
					label="Include on-leave users"
					description="Include approved leave context."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeOnLeave: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeTime}
					disabled={formDisabled}
					label="Include time"
					description="Include time-tracking summaries."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeTime: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeBlockers}
					disabled={formDisabled}
					label="Include blockers"
					description="Highlight blocker-related answers."
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeBlockers: checked })}
				/>
			</div>

			<div className="campfire-settings-control-grid campfire-settings-control-grid--two">
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

			<div className="campfire-settings-form-actions">
				<CampfireControlButton type="button" disabled={formDisabled || !changed} onClick={() => void props.onSave(props.rule)}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					{props.saving ? 'Saving…' : 'Save report'}
				</CampfireControlButton>
			</div>
		</CampfireSettingsPanel>
	);
}
