import { startTransition, useEffect, useState } from 'react';
import type { ChangeEvent, ComponentProps, ReactElement } from 'react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * CampfireResponsiveInputProps mirrors the shared Input primitive but keeps
 * keystrokes local to the small input component before scheduling the owning
 * page update as low-priority React work.
 */
type CampfireResponsiveInputProps = Omit<ComponentProps<typeof Input>, 'defaultValue' | 'onChange' | 'value'> & {
	readonly value: string;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireResponsiveTextareaProps mirrors the shared Textarea primitive with
 * the same local-keystroke buffering strategy as CampfireResponsiveInput.
 */
type CampfireResponsiveTextareaProps = Omit<ComponentProps<typeof Textarea>, 'defaultValue' | 'onChange' | 'value'> & {
	readonly value: string;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireResponsiveInput prevents large Campfire pages from re-rendering in
 * the critical path of every typed character while still keeping parent draft
 * state up to date for validation and submit handlers.
 */
export function CampfireResponsiveInput(props: CampfireResponsiveInputProps): ReactElement {
	const { onValueChange, value, ...inputProps } = props;
	const [draftValue, setDraftValue] = useState(value);

	useEffect(() => {
		setDraftValue(value);
	}, [value]);

	/**
	 * handleChange updates the visible input immediately and schedules the parent
	 * state update as transition work so typing stays responsive inside heavy
	 * modal pages.
	 */
	function handleChange(event: ChangeEvent<HTMLInputElement>): void {
		const nextValue = event.currentTarget.value;
		setDraftValue(nextValue);
		startTransition(() => {
			onValueChange(nextValue);
		});
	}

	return <Input {...inputProps} value={draftValue} onChange={handleChange} />;
}

/**
 * CampfireResponsiveTextarea keeps textarea typing responsive when the owner
 * component contains expensive lists, cards, or derived state.
 */
export function CampfireResponsiveTextarea(props: CampfireResponsiveTextareaProps): ReactElement {
	const { onValueChange, value, ...textareaProps } = props;
	const [draftValue, setDraftValue] = useState(value);

	useEffect(() => {
		setDraftValue(value);
	}, [value]);

	/**
	 * handleChange updates the visible textarea immediately and schedules the
	 * parent draft update as low-priority work.
	 */
	function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
		const nextValue = event.currentTarget.value;
		setDraftValue(nextValue);
		startTransition(() => {
			onValueChange(nextValue);
		});
	}

	return <Textarea {...textareaProps} value={draftValue} onChange={handleChange} />;
}
