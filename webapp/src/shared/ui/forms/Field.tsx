import { createContext, use, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { Text } from '../layout/Text';

/**
 * FieldControl is what a form control needs from its surrounding Field.
 */
export type FieldControl = {
	readonly id?: string;
	readonly 'aria-describedby'?: string;
	readonly 'aria-invalid'?: true;
	readonly 'aria-required'?: true;
};

const FieldContext = createContext<FieldControl>({});

/**
 * useFieldControl returns the id and aria attributes a control should spread onto its element.
 */
export function useFieldControl(): FieldControl {
	return use(FieldContext);
}

type FieldProps = {
	readonly label: string;
	/** Helper text shown under the label. */
	readonly description?: string;
	readonly error?: string;
	readonly required?: boolean;
	/** Renders the label as a group caption (radio groups, list inputs) instead of tying it to one input. */
	readonly group?: boolean;
	readonly children: ReactNode;
};

/**
 * Field labels a control and wires its description and error text for assistive technology.
 */
export function Field(props: FieldProps): ReactElement {
	const baseID = useId();
	const inputID = `${baseID}-input`;
	const descriptionID = `${baseID}-description`;
	const errorID = `${baseID}-error`;
	const describedBy = [props.description !== undefined ? descriptionID : '', props.error !== undefined ? errorID : '']
		.filter(Boolean)
		.join(' ');

	const control: FieldControl = {
		id: inputID,
		'aria-describedby': describedBy === '' ? undefined : describedBy,
		'aria-invalid': props.error === undefined ? undefined : true,
		'aria-required': props.required === true ? true : undefined,
	};

	const caption = (
		<span dir="auto" className="cf:text-sm cf:font-bold cf:text-ink">
			{props.label}
			{props.required === true && (
				<span aria-hidden="true" className="cf:ms-1 cf:text-rose">
					*
				</span>
			)}
		</span>
	);

	return (
		<FieldContext value={control}>
			<div
				className="cf:flex cf:min-w-0 cf:flex-col cf:gap-1.5"
				role={props.group === true ? 'group' : undefined}
				aria-labelledby={props.group === true ? `${baseID}-label` : undefined}
			>
				{props.group === true ? <span id={`${baseID}-label`}>{caption}</span> : <label htmlFor={inputID}>{caption}</label>}
				{props.description !== undefined && (
					<span id={descriptionID}>
						<Text size="sm" tone="muted" userContent>
							{props.description}
						</Text>
					</span>
				)}
				{props.children}
				{props.error !== undefined && (
					<span id={errorID} role="alert">
						<Text size="sm" tone="danger" weight="medium">
							{props.error}
						</Text>
					</span>
				)}
			</div>
		</FieldContext>
	);
}
