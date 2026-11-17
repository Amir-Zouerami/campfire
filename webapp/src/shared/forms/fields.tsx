import type { ReactElement } from 'react';

import { ChannelPicker } from '@/shared/channels';
import { useI18n } from '@/shared/i18n';
import { UserMultiPicker, UserPicker } from '@/shared/users';
import {
	Checkbox,
	CheckboxGroup,
	ChoiceGroup,
	Combobox,
	DateField,
	DateTimeInput,
	Field,
	ListInput,
	NumberInput,
	Select,
	Switch,
	TextArea,
	TextInput,
	TimeField,
	TimezoneSelect,
} from '@/shared/ui';
import type { ChoiceOption, ComboboxOption, ListSuggestion, SelectOption } from '@/shared/ui';

import { messageOfError } from './errors';
import { useFieldContext } from './form';

/**
 * useFieldView reads the active field and its (translated) visible error.
 * An error is visible once the user has left the field or tried to submit.
 */
function useFieldView<Value>(): {
	readonly value: Value;
	readonly setValue: (value: Value) => void;
	readonly blur: () => void;
	readonly error: string | undefined;
} {
	const field = useFieldContext<Value>();
	const { translateIfKey } = useI18n();
	const showErrors = field.state.meta.isTouched || field.form.state.submissionAttempts > 0;
	const message = showErrors ? messageOfError(field.state.meta.errors[0]) : undefined;

	return {
		value: field.state.value,
		setValue: field.handleChange,
		blur: field.handleBlur,
		error: message === undefined ? undefined : translateIfKey(message),
	};
}

type LabelProps = {
	readonly label: string;
	readonly description?: string;
	readonly required?: boolean;
};

/**
 * TextField is a labelled single-line text field bound to the form.
 */
export function TextField(
	props: LabelProps & {
		readonly placeholder?: string;
		readonly userContent?: boolean;
		readonly ltr?: boolean;
		readonly disabled?: boolean;
		readonly maxLength?: number;
	},
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<TextInput
				value={view.value}
				onChange={view.setValue}
				onBlur={view.blur}
				placeholder={props.placeholder}
				userContent={props.userContent}
				ltr={props.ltr}
				disabled={props.disabled}
				maxLength={props.maxLength}
			/>
		</Field>
	);
}

/**
 * TextAreaField is a labelled multi-line text field bound to the form.
 */
export function TextAreaField(
	props: LabelProps & { readonly placeholder?: string; readonly rows?: number; readonly userContent?: boolean; readonly ltr?: boolean },
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<TextArea
				value={view.value}
				onChange={view.setValue}
				onBlur={view.blur}
				placeholder={props.placeholder}
				rows={props.rows}
				userContent={props.userContent}
				ltr={props.ltr}
			/>
		</Field>
	);
}

/**
 * NumberField is a labelled digits-only field bound to the form (values are strings).
 */
export function NumberField(props: LabelProps & { readonly placeholder?: string; readonly decimal?: boolean }): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<NumberInput value={view.value} onChange={view.setValue} onBlur={view.blur} placeholder={props.placeholder} decimal={props.decimal} />
		</Field>
	);
}

/**
 * SelectField is a labelled native dropdown bound to the form.
 */
export function SelectField(
	props: LabelProps & { readonly options: readonly SelectOption[]; readonly placeholder?: string; readonly disabled?: boolean },
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<Select
				value={view.value}
				options={props.options}
				onChange={view.setValue}
				onBlur={view.blur}
				placeholder={props.placeholder}
				disabled={props.disabled}
			/>
		</Field>
	);
}

/**
 * ChoiceField is a labelled single-choice button group bound to the form.
 */
export function ChoiceField(
	props: LabelProps & {
		readonly options: readonly ChoiceOption[];
		readonly variant?: 'buttons' | 'segmented';
		readonly disabled?: boolean;
	},
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field group label={props.label} description={props.description} required={props.required} error={view.error}>
			<ChoiceGroup
				value={view.value}
				options={props.options}
				onChange={view.setValue}
				variant={props.variant}
				label={props.label}
				disabled={props.disabled}
			/>
		</Field>
	);
}

/**
 * BooleanChoiceField asks a yes/no question, storing a boolean.
 */
export function BooleanChoiceField(
	props: LabelProps & { readonly yesLabel: string; readonly noLabel: string; readonly disabled?: boolean },
): ReactElement {
	const view = useFieldView<boolean>();

	return (
		<Field group label={props.label} description={props.description} required={props.required} error={view.error}>
			<ChoiceGroup
				value={view.value ? 'yes' : 'no'}
				options={[
					{ value: 'no', label: props.noLabel },
					{ value: 'yes', label: props.yesLabel },
				]}
				onChange={next => view.setValue(next === 'yes')}
				label={props.label}
				disabled={props.disabled}
			/>
		</Field>
	);
}

/**
 * CheckboxField is a labelled checkbox bound to the form.
 */
export function CheckboxField(props: { readonly label: string; readonly description?: string; readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<boolean>();

	return (
		<Checkbox checked={view.value} onChange={view.setValue} label={props.label} description={props.description} disabled={props.disabled} />
	);
}

/**
 * SwitchField is a labelled on/off setting bound to the form.
 */
export function SwitchField(props: { readonly label: string; readonly description?: string; readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<boolean>();

	return (
		<Switch checked={view.value} onChange={view.setValue} label={props.label} description={props.description} disabled={props.disabled} />
	);
}

/**
 * DatePickerField is a labelled date control bound to the form (stores YYYY-MM-DD).
 */
export function DatePickerField(
	props: LabelProps & { readonly min?: string; readonly max?: string; readonly disabled?: boolean },
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<DateField value={view.value} onChange={view.setValue} onBlur={view.blur} min={props.min} max={props.max} disabled={props.disabled} />
		</Field>
	);
}

/**
 * TimePickerField is a labelled 24-hour time control bound to the form (stores HH:mm).
 */
export function TimePickerField(props: LabelProps & { readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<TimeField value={view.value} onChange={view.setValue} onBlur={view.blur} disabled={props.disabled} />
		</Field>
	);
}

/**
 * ListField is a labelled growing list of one-line items bound to the form.
 */
export function ListField(
	props: LabelProps & {
		readonly placeholder: string;
		readonly addLabel: string;
		readonly removeLabel: string;
		readonly suggestionsLabel: string;
		readonly existingLabel: string;
		readonly suggest?: (query: string) => readonly ListSuggestion[];
		readonly isExisting?: (text: string) => boolean;
		readonly disabled?: boolean;
	},
): ReactElement {
	const view = useFieldView<readonly string[]>();

	return (
		<Field group label={props.label} description={props.description} required={props.required} error={view.error}>
			<ListInput
				value={view.value}
				onChange={view.setValue}
				placeholder={props.placeholder}
				addLabel={props.addLabel}
				removeLabel={props.removeLabel}
				suggestionsLabel={props.suggestionsLabel}
				existingLabel={props.existingLabel}
				suggest={props.suggest}
				isExisting={props.isExisting}
				disabled={props.disabled}
			/>
		</Field>
	);
}

/**
 * UserField picks one workspace member, bound to the form (stores the user ID).
 */
export function UserField(
	props: LabelProps & { readonly placeholder?: string; readonly clearable?: boolean; readonly disabled?: boolean },
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<UserPicker
				value={view.value}
				onChange={view.setValue}
				onBlur={view.blur}
				placeholder={props.placeholder}
				clearable={props.clearable}
				disabled={props.disabled}
				label={props.label}
			/>
		</Field>
	);
}

/**
 * UserMultiField picks several workspace members, bound to the form.
 */
export function UserMultiField(props: LabelProps & { readonly placeholder?: string; readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<readonly string[]>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<UserMultiPicker
				value={view.value}
				onChange={view.setValue}
				placeholder={props.placeholder}
				disabled={props.disabled}
				label={props.label}
			/>
		</Field>
	);
}

/**
 * ChannelField picks a Mattermost channel in a team, bound to the form (stores the channel ID).
 */
export function ChannelField(
	props: LabelProps & { readonly teamID: string; readonly placeholder?: string; readonly clearable?: boolean; readonly disabled?: boolean },
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<ChannelPicker
				teamID={props.teamID}
				value={view.value}
				onChange={view.setValue}
				placeholder={props.placeholder}
				clearable={props.clearable}
				disabled={props.disabled}
				label={props.label}
			/>
		</Field>
	);
}

/**
 * TimezoneField picks an IANA timezone, bound to the form.
 */
export function TimezoneField(props: LabelProps & { readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<TimezoneSelect value={view.value} onChange={view.setValue} onBlur={view.blur} disabled={props.disabled} />
		</Field>
	);
}

/**
 * MultiSelectField chooses any number of options from a short list, bound to the form.
 */
export function MultiSelectField(props: LabelProps & { readonly options: readonly string[]; readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<readonly string[]>();

	return (
		<Field group label={props.label} description={props.description} required={props.required} error={view.error}>
			<CheckboxGroup options={props.options} value={view.value} onChange={view.setValue} disabled={props.disabled} />
		</Field>
	);
}

/**
 * DateTimeField is a labelled date and time pair bound to the form (stores `YYYY-MM-DDTHH:mm`).
 */
export function DateTimeField(props: LabelProps & { readonly disabled?: boolean }): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field group label={props.label} description={props.description} required={props.required} error={view.error}>
			<DateTimeInput value={view.value} onChange={view.setValue} disabled={props.disabled} />
		</Field>
	);
}

/**
 * ComboboxField is a labelled searchable single choice bound to the form (stores the option value).
 */
export function ComboboxField(
	props: LabelProps & {
		readonly options: readonly ComboboxOption[];
		readonly placeholder?: string;
		readonly emptyText: string;
		readonly clearable?: boolean;
		readonly disabled?: boolean;
	},
): ReactElement {
	const view = useFieldView<string>();

	return (
		<Field label={props.label} description={props.description} required={props.required} error={view.error}>
			<Combobox
				value={view.value}
				onChange={view.setValue}
				onBlur={view.blur}
				options={props.options}
				placeholder={props.placeholder}
				emptyText={props.emptyText}
				clearable={props.clearable}
				disabled={props.disabled}
				label={props.label}
			/>
		</Field>
	);
}
