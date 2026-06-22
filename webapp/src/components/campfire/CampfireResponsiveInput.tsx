import { startTransition, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ComponentProps, FocusEvent, ReactElement } from 'react';

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
 * local-keystroke buffering and debounced owner updates for heavy modal pages.
 */
type CampfireResponsiveTextareaProps = Omit<ComponentProps<typeof Textarea>, 'defaultValue' | 'onChange' | 'value'> & {
	readonly value: string;
	readonly onValueChange: (value: string) => void;
	readonly commitDelayMs?: number;
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

	return <Input {...inputProps} dir={inputProps.dir ?? 'auto'} value={draftValue} onChange={handleChange} />;
}

/**
 * CampfireResponsiveTextarea keeps textarea typing local first. The owner page
 * is updated after a short debounce and immediately on blur, avoiding expensive
 * derived-state work on every keystroke while preserving submit correctness.
 */
export function CampfireResponsiveTextarea(props: CampfireResponsiveTextareaProps): ReactElement {
	const { commitDelayMs = 240, onBlur, onValueChange, value, ...textareaProps } = props;
	const [draftValue, setDraftValue] = useState(value);
	const draftValueRef = useRef(value);
	const committedValueRef = useRef(value);
	const onValueChangeRef = useRef(onValueChange);
	const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

	useEffect(() => {
		onValueChangeRef.current = onValueChange;
	}, [onValueChange]);

	useEffect(() => {
		if (value === committedValueRef.current) {
			return;
		}

		committedValueRef.current = value;
		draftValueRef.current = value;
		setDraftValue(value);
	}, [value]);

	useEffect(() => {
		return () => {
			clearPendingCommit();
		};
	}, []);

	/**
	 * clearPendingCommit clears a scheduled parent update.
	 */
	function clearPendingCommit(): void {
		if (timeoutRef.current === null) {
			return;
		}

		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	}

	/**
	 * commitValue sends the latest textarea value to the owning page once.
	 */
	function commitValue(nextValue: string): void {
		clearPendingCommit();
		if (nextValue === committedValueRef.current) {
			return;
		}

		committedValueRef.current = nextValue;
		startTransition(() => {
			onValueChangeRef.current(nextValue);
		});
	}

	/**
	 * scheduleCommit debounces owner-page updates for textarea typing.
	 */
	function scheduleCommit(nextValue: string): void {
		clearPendingCommit();
		timeoutRef.current = window.setTimeout(() => {
			commitValue(nextValue);
		}, commitDelayMs);
	}

	/**
	 * handleChange updates only the textarea's local value immediately.
	 */
	function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
		const nextValue = event.currentTarget.value;
		draftValueRef.current = nextValue;
		setDraftValue(nextValue);
		scheduleCommit(nextValue);
	}

	/**
	 * handleBlur flushes pending textarea text before submit buttons run.
	 */
	function handleBlur(event: FocusEvent<HTMLTextAreaElement>): void {
		commitValue(draftValueRef.current);
		onBlur?.(event);
	}

	return (
		<Textarea
			{...textareaProps}
			dir={textareaProps.dir ?? 'auto'}
			value={draftValue}
			onBlur={handleBlur}
			onChange={handleChange}
		/>
	);
}
