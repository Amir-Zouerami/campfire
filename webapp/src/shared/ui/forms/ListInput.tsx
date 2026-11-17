import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { Button } from '../primitives/Button';
import { Icon } from '../primitives/Icon';
import { CONTROL_CLASS, POPUP_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

/**
 * ListSuggestion is an existing item offered while typing a list row.
 */
export type ListSuggestion = {
	readonly id: string;
	readonly label: string;
	/** Secondary text such as a status. */
	readonly meta?: string;
};

type ListInputProps = {
	/** One string per row. A trailing blank row is added for display; blank rows are not stored. */
	readonly value: readonly string[];
	readonly onChange: (rows: readonly string[]) => void;
	readonly placeholder: string;
	readonly addLabel: string;
	readonly removeLabel: string;
	/** Accessible name for the suggestion list. */
	readonly suggestionsLabel: string;
	/** Hint shown under a row that exactly matches an existing item. */
	readonly existingLabel: string;
	readonly suggest?: (query: string) => readonly ListSuggestion[];
	/** Whether a row's text exactly matches an existing item. */
	readonly isExisting?: (text: string) => boolean;
	readonly disabled?: boolean;
};

const MIN_QUERY_LENGTH = 2;

/**
 * ListInput is a list of one-line items that grows as you type: filling the last row
 * appends a fresh empty one, Enter moves to the next row, and rows can be removed.
 * Each row can offer suggestions from existing items (used to reuse existing tasks).
 */
export function ListInput(props: ListInputProps): ReactElement {
	const { locale } = useI18n();
	const formatNumber = (value: number): string => new Intl.NumberFormat(locale).format(value);
	const control = useFieldControl();
	const inputs = useRef<(HTMLInputElement | null)[]>([]);
	const [focusedRow, setFocusedRow] = useState<number | null>(null);
	const [activeSuggestion, setActiveSuggestion] = useState(-1);

	const rows = props.value.length > 0 && (props.value[props.value.length - 1] ?? '').trim() === '' ? props.value : [...props.value, ''];

	const query = focusedRow === null ? '' : (rows[focusedRow] ?? '');
	const suggestions =
		props.suggest !== undefined && query.trim().length >= MIN_QUERY_LENGTH && !(props.isExisting?.(query) ?? false)
			? props.suggest(query)
			: [];

	function update(index: number, text: string): void {
		setActiveSuggestion(-1);
		props.onChange(rows.map((row, position) => (position === index ? text : row)));
	}

	function remove(index: number): void {
		props.onChange(rows.filter((_row, position) => position !== index));
	}

	function pickSuggestion(index: number, suggestion: ListSuggestion): void {
		update(index, suggestion.label);
		setActiveSuggestion(-1);
		inputs.current[index]?.focus();
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number): void {
		// Never let list editing keys reach the surrounding dialog or form.
		event.stopPropagation();

		if (event.key === 'ArrowDown' && suggestions.length > 0) {
			event.preventDefault();
			setActiveSuggestion(current => Math.min(current + 1, suggestions.length - 1));
		} else if (event.key === 'ArrowUp' && suggestions.length > 0) {
			event.preventDefault();
			setActiveSuggestion(current => Math.max(current - 1, 0));
		} else if (event.key === 'Escape' && suggestions.length > 0) {
			event.preventDefault();
			setFocusedRow(null);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const chosen = suggestions[activeSuggestion];
			if (chosen !== undefined) {
				pickSuggestion(index, chosen);
			} else if ((rows[index] ?? '').trim() !== '') {
				inputs.current[index + 1]?.focus();
			}
		}
	}

	function handleBlur(index: number): void {
		setFocusedRow(null);
		// Tidy up: an emptied middle row is dropped when the user leaves it.
		if ((rows[index] ?? '').trim() === '' && index < rows.length - 1) {
			remove(index);
		}
	}

	return (
		<div className="cf:flex cf:flex-col cf:gap-2.5">
			{rows.map((row, index) => {
				const showSuggestions = focusedRow === index && suggestions.length > 0;

				return (
					<div key={index} className="cf:relative cf:grid cf:grid-cols-[40px_minmax(0,1fr)_auto] cf:items-start cf:gap-2.5">
						<span
							aria-hidden="true"
							className="cf:grid cf:h-11 cf:place-items-center cf:rounded-control cf:border cf:border-line-strong cf:bg-surface cf:text-sm cf:font-bold cf:text-muted"
						>
							{formatNumber(index + 1)}
						</span>
						<div className="cf:min-w-0">
							<input
								{...(index === 0 ? control : {})}
								ref={element => {
									inputs.current[index] = element;
								}}
								value={row}
								dir="auto"
								autoComplete="off"
								disabled={props.disabled}
								placeholder={props.placeholder}
								role="combobox"
								aria-expanded={showSuggestions}
								aria-autocomplete="list"
								aria-controls={showSuggestions ? `${control.id ?? 'list'}-suggestions` : undefined}
								className={cn(CONTROL_CLASS, 'cf:h-11')}
								onFocus={() => setFocusedRow(index)}
								onBlur={() => handleBlur(index)}
								onChange={event => update(index, event.target.value)}
								onKeyDown={event => handleKeyDown(event, index)}
							/>
							{props.isExisting?.(row) === true && (
								<p className="cf:m-0 cf:mt-1.5 cf:flex cf:items-center cf:gap-1.5 cf:text-xs cf:font-semibold cf:text-teal-ink">
									<Icon icon={CheckCircle2} size="xs" />
									{props.existingLabel}
								</p>
							)}
							{showSuggestions && (
								<ul
									id={`${control.id ?? 'list'}-suggestions`}
									role="listbox"
									aria-label={props.suggestionsLabel}
									className={cn(POPUP_CLASS, 'cf:absolute cf:inset-x-12 cf:top-12 cf:z-30 cf:m-0 cf:list-none')}
								>
									{suggestions.map((suggestion, position) => (
										<li
											key={suggestion.id}
											role="option"
											aria-selected={position === activeSuggestion}
											onMouseDown={event => {
												event.preventDefault();
												pickSuggestion(index, suggestion);
											}}
											className={cn(
												'cf:flex cf:cursor-pointer cf:items-center cf:justify-between cf:gap-3 cf:rounded-lg cf:px-3 cf:py-2 cf:text-sm',
												position === activeSuggestion ? 'cf:bg-sunken' : 'cf:hover:bg-sunken',
											)}
										>
											<span dir="auto" className="cf:truncate cf:font-medium">
												{suggestion.label}
											</span>
											{suggestion.meta !== undefined && <span className="cf:shrink-0 cf:text-xs cf:text-muted">{suggestion.meta}</span>}
										</li>
									))}
								</ul>
							)}
						</div>
						<Button
							variant="ghost"
							size="sm"
							icon={Trash2}
							disabled={props.disabled === true || rows.length === 1}
							onClick={() => remove(index)}
						>
							{props.removeLabel}
						</Button>
					</div>
				);
			})}
			<div className="cf:flex cf:justify-end">
				<Button
					variant="secondary"
					size="sm"
					icon={Plus}
					disabled={props.disabled}
					onClick={() => {
						props.onChange([...rows, '']);
						window.setTimeout(() => inputs.current[rows.length]?.focus(), 0);
					}}
				>
					{props.addLabel}
				</Button>
			</div>
		</div>
	);
}
