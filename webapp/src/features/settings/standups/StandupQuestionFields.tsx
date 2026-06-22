import type { ReactElement } from 'react';

import { CampfireCheckboxField } from '@/components/campfire/CampfireCheckboxField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';
import { CampfireResponsiveInput, CampfireResponsiveTextarea } from '@/components/campfire/CampfireResponsiveInput';
import type { StandupTemplate } from '@/types/domain';

import {
	questionTypeNeedsOptions,
	SUPPORTED_QUESTION_TYPES,
	toQuestionType,
} from './standup-settings.helpers';
import { questionTypeLabel } from './standup-settings.i18n';
import type { StandupQuestionDraft, StandupQuestionDraftPatch } from './standup-settings.types';
import { StandupField } from './StandupField';

/**
 * StandupQuestionFieldsProps contains shared question form fields.
 */
type StandupQuestionFieldsProps = {
	readonly idPrefix: string;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupQuestionDraft;
	readonly disabled: boolean;
	readonly allowTemplateChange: boolean;
	readonly hideTemplateField?: boolean;
	readonly onChange: (patch: StandupQuestionDraftPatch) => void;
};

/**
 * StandupQuestionFields renders dynamic-form question controls.
 */
export function StandupQuestionFields(props: StandupQuestionFieldsProps): ReactElement {
	const { t } = useI18n();
	const needsOptions = questionTypeNeedsOptions(props.draft.type);
	const taskCreationSupported = props.draft.type === 'work_items';

	const showTemplateField = props.hideTemplateField !== true;

	return (
		<div className="campfire-standup-question-field-grid">
			<div className={showTemplateField ? 'campfire-standup-question-primary-grid' : 'campfire-standup-question-primary-grid campfire-standup-question-primary-grid--no-template'}>
				{showTemplateField && (
					<StandupField htmlFor={`${props.idPrefix}-template`} label={t('settings.standups.fields.template')}>
						<CampfireSelect
							id={`${props.idPrefix}-template`}
							disabled={props.disabled || !props.allowTemplateChange}
							value={props.draft.templateId}
							onValueChange={(value) => props.onChange({ templateId: value })}
						>
							<option value="">{t('settings.standups.fields.template.placeholder')}</option>
							{props.templates.map((template) => (
								<option key={template.id} value={template.id}>
									{template.name}
								</option>
							))}
						</CampfireSelect>
					</StandupField>
				)}

				<StandupField htmlFor={`${props.idPrefix}-type`} label={t('settings.standups.fields.type')}>
					<CampfireSelect
						id={`${props.idPrefix}-type`}
						disabled={props.disabled}
						value={props.draft.type}
						onValueChange={(value) => {
							const nextType = toQuestionType(value);
							props.onChange({
								type: nextType,
								createsTasks: nextType === 'work_items' ? props.draft.createsTasks : false,
							});
						}}
					>
						{SUPPORTED_QUESTION_TYPES.map((type) => (
							<option key={type} value={type}>
								{questionTypeLabel(t, type)}
							</option>
						))}
					</CampfireSelect>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-position`} label={t('settings.standups.fields.position')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-position`}
						type="number"
						disabled={props.disabled}
						min={0}
						step={1}
						value={String(props.draft.position)}
						onValueChange={(value) =>
							props.onChange({
								position: Number.parseInt(value, 10) || 0,
							})
						}
					/>
				</StandupField>
			</div>

			<div className="campfire-standup-question-label-grid">
				<StandupField htmlFor={`${props.idPrefix}-label`} label={t('settings.standups.fields.questionLabel')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-label`}
						disabled={props.disabled}
						placeholder={t('settings.standups.fields.questionLabel.placeholder')}
						value={props.draft.label}
						onValueChange={(value) => props.onChange({ label: value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-section`} label={t('settings.standups.fields.section')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-section`}
						disabled={props.disabled}
						placeholder="general"
						value={props.draft.section}
						onValueChange={(value) => props.onChange({ section: value })}
					/>
				</StandupField>
			</div>

			<div className="campfire-standup-question-helper-grid">
				<StandupField htmlFor={`${props.idPrefix}-help`} label={t('settings.standups.fields.helpText')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-help`}
						disabled={props.disabled}
						placeholder={t('settings.standups.fields.helpText.placeholder')}
						value={props.draft.helpText}
						onValueChange={(value) => props.onChange({ helpText: value })}
					/>
				</StandupField>

				<StandupField htmlFor={`${props.idPrefix}-placeholder`} label={t('settings.standups.fields.placeholder')}>
					<CampfireResponsiveInput
						id={`${props.idPrefix}-placeholder`}
						disabled={props.disabled}
						placeholder={t('settings.standups.fields.placeholder.placeholder')}
						value={props.draft.placeholder}
						onValueChange={(value) => props.onChange({ placeholder: value })}
					/>
				</StandupField>
			</div>

			{needsOptions && (
				<StandupField
					htmlFor={`${props.idPrefix}-options`}
					label={t('settings.standups.fields.options')}
					description={t('settings.standups.fields.options.description')}
				>
					<CampfireResponsiveTextarea
						id={`${props.idPrefix}-options`}
						className="cf:min-h-28"
						disabled={props.disabled}
						placeholder={t('settings.standups.fields.options.placeholder')}
						value={props.draft.optionsText}
						onValueChange={(value) => props.onChange({ optionsText: value })}
					/>
				</StandupField>
			)}

			<div className="campfire-standup-question-behavior-grid">
				<CampfireCheckboxField
					checked={props.draft.required}
					disabled={props.disabled}
					label={t('settings.standups.fields.required')}
					description={t('settings.standups.fields.required.description')}
					onCheckedChange={(checked) => props.onChange({ required: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.showInReport}
					disabled={props.disabled}
					label={t('settings.standups.fields.showInReport')}
					description={t('settings.standups.fields.showInReport.description')}
					onCheckedChange={(checked) => props.onChange({ showInReport: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.isPrivate}
					disabled={props.disabled}
					label={t('settings.standups.fields.private')}
					description={t('settings.standups.fields.private.description')}
					onCheckedChange={(checked) => props.onChange({ isPrivate: checked })}
				/>

				<CampfireCheckboxField
					checked={props.draft.createsTasks}
					disabled={props.disabled || !taskCreationSupported}
					label={t('settings.standups.fields.createTasks')}
					description={t('settings.standups.fields.createTasks.description')}
					onCheckedChange={(checked) => props.onChange({ createsTasks: checked })}
				/>
			</div>
		</div>
	);
}
