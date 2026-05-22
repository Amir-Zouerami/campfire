import type { ReactElement } from 'react';
import { FileText, Save } from 'lucide-react';

import { CampfireStatusPill } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ReportRule } from '@/types/domain';

import {
	formatDateTime,
	formatReportKind,
	formatReportSortMode,
	reportRuleCardClassName,
	reportRuleHasChanges,
	reportSortOptions,
	selectClassName,
	shortID,
	toReportSortMode,
} from './report-rules.helpers';
import { ReportRuleBooleanField } from './ReportRuleBooleanField';
import type { ReportRuleDraft, ReportRuleDraftPatch } from './report-rules.types';

/**
 * ReportRuleCardProps contains one report rule and its editable draft.
 */
type ReportRuleCardProps = {
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

	return (
		<article className={reportRuleCardClassName(props.draft.enabled)}>
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:flex cf:flex-wrap cf:items-center cf:gap-2 cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						<FileText className="cf:size-4" />
						{formatReportKind(props.rule.reportKind)}
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Report rule {shortID(props.rule.id)}
					</h3>
					<p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-muted-foreground">
						Schedule {shortID(props.rule.scheduleId)} · Updated {formatDateTime(props.rule.updatedAt)}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
						{props.draft.enabled ? 'Enabled' : 'Disabled'}
					</CampfireStatusPill>
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? 'Unsaved' : 'Saved'}
					</CampfireStatusPill>
				</div>
			</div>

			<div className="cf:grid cf:gap-3 cf:xl:grid-cols-2">
				<ReportRuleBooleanField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label="Enable this report rule"
					description="Allow Campfire to generate this scheduled report."
					onChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.postToChannel}
					disabled={formDisabled}
					label="Post to channel"
					description="Automatically post the generated report to the workspace channel."
					onChange={checked => props.onDraftChange(props.rule.id, { postToChannel: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.previewRequired}
					disabled={formDisabled}
					label="Preview required"
					description="Require manual review before posting when supported by the workflow."
					onChange={checked => props.onDraftChange(props.rule.id, { previewRequired: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.includeMissing}
					disabled={formDisabled}
					label="Include missing users"
					description="Show users who did not submit when the report type supports it."
					onChange={checked => props.onDraftChange(props.rule.id, { includeMissing: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.includeOnLeave}
					disabled={formDisabled}
					label="Include on-leave users"
					description="Show approved leave context in generated reports."
					onChange={checked => props.onDraftChange(props.rule.id, { includeOnLeave: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.includeTime}
					disabled={formDisabled}
					label="Include time"
					description="Include time-tracking summaries when the report supports it."
					onChange={checked => props.onDraftChange(props.rule.id, { includeTime: checked })}
				/>

				<ReportRuleBooleanField
					checked={props.draft.includeBlockers}
					disabled={formDisabled}
					label="Include blockers"
					description="Highlight blocker-related answers and sections."
					onChange={checked => props.onDraftChange(props.rule.id, { includeBlockers: checked })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor={`campfire-report-sort-${props.rule.id}`}>Sort mode</Label>
				<select
					id={`campfire-report-sort-${props.rule.id}`}
					className={selectClassName()}
					disabled={formDisabled}
					value={props.draft.sortMode}
					onChange={event =>
						props.onDraftChange(props.rule.id, { sortMode: toReportSortMode(event.currentTarget.value) })
					}
				>
					{reportSortOptions.map(sortMode => (
						<option key={sortMode} value={sortMode}>
							{formatReportSortMode(sortMode)}
						</option>
					))}
				</select>
			</div>

			<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4">
				<p className="cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
					Report rules control scheduled generation. Manual report preview and posting stays in Reports.
				</p>

				<Button type="button" disabled={formDisabled || !changed} onClick={() => void props.onSave(props.rule)}>
					<Save className="cf:size-4" />
					{props.saving ? 'Saving…' : 'Save rule'}
				</Button>
			</div>
		</article>
	);
}
