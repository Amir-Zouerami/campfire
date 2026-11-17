import type { ReactElement } from 'react';

import {
	BooleanChoiceField,
	CheckboxField,
	DatePickerField,
	DateTimeField,
	ListField,
	MultiSelectField,
	NumberField,
	SelectField,
	TextAreaField,
	TextField,
	TimePickerField,
} from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import type { ListSuggestion } from '@/shared/ui';
import type { StandupQuestion } from '@/shared/types/domain';

import type { TaskIndex } from '../tasks/tasks';

type StandupQuestionControlProps = {
	readonly question: StandupQuestion;
	readonly tasks: TaskIndex;
	readonly disabled: boolean;
};

/**
 * legacyHelpText hides two old default hints that earlier versions seeded into task-list
 * questions; the list input explains itself, so they are only noise.
 */
function visibleHelpText(helpText: string): string | undefined {
	const normalized = helpText.trim().toLowerCase();
	const isLegacyNoise =
		(normalized.includes('start typing') && normalized.includes('campfire opens')) ||
		(normalized.includes('use suggestions') && normalized.includes('reuse existing tasks'));

	return normalized === '' || isLegacyNoise ? undefined : helpText.trim();
}

/**
 * StandupQuestionControl renders the right bound control for one standup question's type.
 * It must be rendered inside a `form.AppField` for that question.
 */
export function StandupQuestionControl(props: StandupQuestionControlProps): ReactElement {
	const { t } = useI18n();
	const { question, disabled } = props;
	const common = { label: question.label, description: visibleHelpText(question.helpText), required: question.required, disabled };

	switch (question.type) {
		case 'work_items':
			return (
				<ListField
					{...common}
					placeholder={question.placeholder || t('myDay.standup.question.workItems.placeholder')}
					addLabel={t('myDay.standup.question.workItems.add')}
					removeLabel={t('myDay.standup.question.workItems.remove')}
					suggestionsLabel={t('myDay.standup.question.workItems.suggestionsLabel')}
					existingLabel={t('myDay.standup.question.workItems.existingTask')}
					isExisting={props.tasks.hasExact}
					suggest={(query): readonly ListSuggestion[] =>
						props.tasks.search(query).map(task => ({ id: task.id, label: task.title, meta: task.status }))
					}
				/>
			);
		case 'long_text':
			return <TextAreaField {...common} userContent placeholder={question.placeholder} />;
		case 'checkbox':
			return <CheckboxField label={question.label} description={common.description} disabled={disabled} />;
		case 'boolean':
			return <BooleanChoiceField {...common} yesLabel={t('common.yes')} noLabel={t('common.no')} />;
		case 'dropdown':
			return (
				<SelectField
					{...common}
					placeholder={t('myDay.standup.question.dropdown.placeholder')}
					options={question.options.map(option => ({ value: option, label: option }))}
				/>
			);
		case 'multi_select':
			return <MultiSelectField {...common} options={question.options} />;
		case 'date':
			return <DatePickerField {...common} />;
		case 'time':
			return <TimePickerField {...common} />;
		case 'datetime':
			return <DateTimeField {...common} />;
		case 'number':
			return <NumberField {...common} decimal placeholder={question.placeholder} />;
		case 'duration':
			return <NumberField {...common} placeholder={question.placeholder || t('myDay.standup.question.duration.placeholder')} />;
		default:
			return <TextField {...common} userContent placeholder={question.placeholder} />;
	}
}
