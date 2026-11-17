import { createFormHook } from '@tanstack/react-form';

import { fieldContext, formContext } from './form';
import {
	BooleanChoiceField,
	ChannelField,
	CheckboxField,
	ChoiceField,
	ComboboxField,
	DatePickerField,
	DateTimeField,
	ListField,
	MultiSelectField,
	NumberField,
	SelectField,
	SwitchField,
	TextAreaField,
	TextField,
	TimePickerField,
	TimezoneField,
	UserField,
	UserMultiField,
} from './fields';
import { SubmitButton } from './SubmitButton';

/**
 * useAppForm creates a form whose fields are the design-system controls, pre-bound.
 *
 *   <form.AppField name="title">{field => <field.TextField label="Title" />}</form.AppField>
 *
 * Validation uses Zod schemas passed as `validators.onChange` / `validators.onSubmit`; error
 * messages in those schemas are translation keys, translated when displayed.
 */
export const { useAppForm, withForm } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		TextField,
		TextAreaField,
		NumberField,
		SelectField,
		ChoiceField,
		ComboboxField,
		BooleanChoiceField,
		CheckboxField,
		SwitchField,
		DatePickerField,
		DateTimeField,
		MultiSelectField,
		TimePickerField,
		ListField,
		UserField,
		UserMultiField,
		ChannelField,
		TimezoneField,
	},
	formComponents: { SubmitButton },
});
