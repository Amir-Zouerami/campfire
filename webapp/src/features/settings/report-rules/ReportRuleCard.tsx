import type { ReactElement } from 'react';
import { FileText, Loader2, Save } from 'lucide-react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';
import type { ReportRule } from '@/types/domain';

import type { StandupScheduleLabel } from '../standup-schedule-labels';
import {
	localizedReportKind,
	localizedReportLanguage,
	localizedReportRuleDescription,
	localizedReportRuleTitle,
	localizedReportSortMode,
} from './report-rules.i18n';
import {
	formatDateTime,
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
	const { t } = useI18n();
	const changed = reportRuleHasChanges(props.rule, props.draft);
	const formDisabled = props.disabled || !props.canManageReportRules;

	return (
		<CampfireSettingsPanel
			className={props.draft.enabled ? 'campfire-rule-panel' : 'campfire-rule-panel campfire-rule-panel--disabled'}
			title={localizedReportRuleTitle(t, props.scheduleLabel, props.rule.reportKind)}
			description={localizedReportRuleDescription(t, props.scheduleLabel, props.rule.reportKind)}
			icon={FileText}
			meta={
				<div className="campfire-rule-meta-stack">
					<span>{props.draft.enabled ? t('common.enabled') : t('common.disabled')}</span>
					<span>{changed ? t('common.unsavedChanges') : t('common.saved')}</span>
					<span>{t('settings.reportRules.meta.updated', { date: formatDateTime(props.rule.updatedAt) })}</span>
					<span>{localizedReportKind(t, props.rule.reportKind)}</span>
					{props.scheduleLabel.unavailable && <span>{t('settings.schedule.missing')}</span>}
				</div>
			}
		>
			<div className="campfire-settings-choice-grid">
				<CampfireCheckboxField
					checked={props.draft.enabled}
					disabled={formDisabled}
					label={t('settings.reportRules.field.enabled.label')}
					description={t('settings.reportRules.field.enabled.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { enabled: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.postToChannel}
					disabled={formDisabled}
					label={t('settings.reportRules.field.postToChannel.label')}
					description={t('settings.reportRules.field.postToChannel.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { postToChannel: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.previewRequired}
					disabled={formDisabled}
					label={t('settings.reportRules.field.previewRequired.label')}
					description={t('settings.reportRules.field.previewRequired.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { previewRequired: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeMissing}
					disabled={formDisabled}
					label={t('settings.reportRules.field.includeMissing.label')}
					description={t('settings.reportRules.field.includeMissing.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeMissing: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeOnLeave}
					disabled={formDisabled}
					label={t('settings.reportRules.field.includeOnLeave.label')}
					description={t('settings.reportRules.field.includeOnLeave.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeOnLeave: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeTime}
					disabled={formDisabled}
					label={t('settings.reportRules.field.includeTime.label')}
					description={t('settings.reportRules.field.includeTime.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeTime: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.includeBlockers}
					disabled={formDisabled}
					label={t('settings.reportRules.field.includeBlockers.label')}
					description={t('settings.reportRules.field.includeBlockers.description')}
					onCheckedChange={checked => props.onDraftChange(props.rule.id, { includeBlockers: checked })}
				/>
			</div>

			<div className="campfire-settings-control-grid campfire-settings-control-grid--two">
				<CampfireField id={`campfire-report-rule-sort-${props.rule.id}`} label={t('settings.reportRules.field.sortMode.label')}>
					<CampfireSelect
						id={`campfire-report-rule-sort-${props.rule.id}`}
						disabled={formDisabled}
						value={props.draft.sortMode}
						onValueChange={value => props.onDraftChange(props.rule.id, { sortMode: toReportSortMode(value) })}
					>
						{reportSortOptions.map(sortMode => (
							<option key={sortMode} value={sortMode}>
								{localizedReportSortMode(t, sortMode)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<CampfireField id={`campfire-report-rule-language-${props.rule.id}`} label={t('settings.reportRules.field.language.label')}>
					<CampfireSelect
						id={`campfire-report-rule-language-${props.rule.id}`}
						disabled={formDisabled}
						value={props.draft.reportLanguage}
						onValueChange={value => props.onDraftChange(props.rule.id, { reportLanguage: toReportLanguage(value) })}
					>
						{reportLanguageOptions.map(language => (
							<option key={language} value={language}>
								{localizedReportLanguage(t, language)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>
			</div>

			<div className="campfire-settings-form-actions">
				<CampfireControlButton type="button" disabled={formDisabled || !changed} onClick={() => void props.onSave(props.rule)}>
					{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
					{props.saving ? t('common.saving') : t('settings.reportRules.action.save')}
				</CampfireControlButton>
			</div>
		</CampfireSettingsPanel>
	);
}
