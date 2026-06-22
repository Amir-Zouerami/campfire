import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent, ReactElement } from 'react';
import { Check, ChevronDown, Clock3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useCampfireFloatingPopover } from './useCampfireFloatingPopover';

/**
 * CampfireTimeInputProps contains a custom Campfire time picker.
 */
type CampfireTimeInputProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly onValueChange: (value: string) => void;
};

/**
 * TimeParts stores parsed time.
 */
type TimeParts = {
	readonly hour: number;
	readonly minute: number;
};

/**
 * HOUR_OPTIONS contains valid hour values.
 */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_value, index) => index);

/**
 * MINUTE_OPTIONS contains valid minute values.
 */
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_value, index) => index * 5);

/**
 * CampfireTimeInput renders a custom styled HH:MM picker.
 */
export function CampfireTimeInput(props: CampfireTimeInputProps): ReactElement {
	const { t } = useI18n();
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const parsedValue = parseTimeValue(props.value);
	const fallbackTime = parsedValue ?? { hour: 9, minute: 0 };

	const [open, setOpen] = useState(false);
	const [draftHour, setDraftHour] = useState(fallbackTime.hour);
	const [draftMinute, setDraftMinute] = useState(fallbackTime.minute);

	useEffect(() => {
		if (parsedValue === null) {
			return;
		}

		setDraftHour(parsedValue.hour);
		setDraftMinute(parsedValue.minute);
	}, [props.value]);

	useEffect(() => {
		if (!open) {
			return;
		}

		/**
		 * handlePointerDown closes the picker when clicking outside.
		 */
		function handlePointerDown(event: PointerEvent): void {
			if (!(event.target instanceof Node)) {
				return;
			}

			if (rootRef.current !== null && rootRef.current.contains(event.target)) {
				return;
			}

			if (popoverRef.current !== null && popoverRef.current.contains(event.target)) {
				return;
			}

			setOpen(false);
		}

		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [open]);

	const selectedLabel = useMemo(() => {
		return props.value.trim() === '' ? t('common.time.placeholder') : props.value;
	}, [props.value, t]);

	const floatingPopover = useCampfireFloatingPopover({
		open,
		triggerRef: buttonRef,
		popoverRef,
		placement: 'top-end',
		minHeight: 240,
		maxHeight: 560,
		maxWidth: 420,
	});

	/**
	 * handleKeyDown supports keyboard toggle/close behavior.
	 */
	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
		if (event.key === 'Escape') {
			setOpen(false);
			return;
		}

		if (event.key === 'ArrowDown' && !open) {
			event.preventDefault();
			setOpen(true);
		}
	}

	/**
	 * selectHour updates the draft hour and commits the time.
	 */
	function selectHour(hour: number): void {
		setDraftHour(hour);
		props.onValueChange(formatTimeValue(hour, draftMinute));
	}

	/**
	 * selectMinute updates the draft minute and commits the time.
	 */
	function selectMinute(minute: number): void {
		setDraftMinute(minute);
		props.onValueChange(formatTimeValue(draftHour, minute));
	}

	/**
	 * selectNow chooses the current local time rounded to five minutes.
	 */
	function selectNow(): void {
		const now = new Date();
		const roundedMinute = Math.round(now.getMinutes() / 5) * 5;
		const hour = roundedMinute === 60 ? (now.getHours() + 1) % 24 : now.getHours();
		const minute = roundedMinute === 60 ? 0 : roundedMinute;

		setDraftHour(hour);
		setDraftMinute(minute);
		props.onValueChange(formatTimeValue(hour, minute));
		setOpen(false);
	}

	const popover = (
		<div
			ref={popoverRef}
			role="dialog"
			aria-label={t('shared.time.choose')}
			className="campfire-picker-portal-scope campfire-time-picker-popover campfire-floating-popover"
			style={floatingPopover.style}
		>
			<div className="campfire-time-picker-glow" />

			<div className="campfire-time-picker-header">
				<div>
					<p className="campfire-time-picker-eyebrow">{t('shared.time.choose')}</p>
					<p className="campfire-time-picker-title">{formatTimeValue(draftHour, draftMinute)}</p>
				</div>

				<Clock3 className="cf:size-6 cf:text-amber-200" />
			</div>

			<div className="campfire-time-picker-columns">
				<TimeColumn
					label={t('shared.time.hour')}
					values={HOUR_OPTIONS}
					selectedValue={draftHour}
					formatValue={value => String(value).padStart(2, '0')}
					onSelect={selectHour}
				/>

				<TimeColumn
					label={t('shared.time.minute')}
					values={MINUTE_OPTIONS}
					selectedValue={draftMinute}
					formatValue={value => String(value).padStart(2, '0')}
					onSelect={selectMinute}
				/>
			</div>

			<div className="campfire-time-picker-footer">
				<button
					type="button"
					className="campfire-time-picker-footer-button campfire-time-picker-footer-button--primary"
					onClick={selectNow}
				>
					{t('common.now')}
				</button>

				<button
					type="button"
					className="campfire-time-picker-footer-button"
					onClick={() => setOpen(false)}
				>
					{t('common.done')}
				</button>
			</div>
		</div>
	);

	return (
		<div ref={rootRef} className={cn('campfire-time-picker', props.className)}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				disabled={props.disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cn('campfire-time-picker-trigger', open && 'campfire-time-picker-trigger--open')}
				onClick={() => setOpen(current => !current)}
				onKeyDown={handleKeyDown}
			>
				<span
					className={cn(
						'campfire-time-picker-value',
						props.value.trim() === '' && 'campfire-time-picker-value--empty',
					)}
				>
					{selectedLabel}
				</span>

				<span className="campfire-time-picker-trigger-icons">
					<Clock3 className="cf:size-5" />
					<ChevronDown className="cf:size-4" />
				</span>
			</button>

			{open && floatingPopover.portalHost !== null && createPortal(popover, floatingPopover.portalHost)}
		</div>
	);
}

/**
 * TimeColumn renders one scrollable time value column.
 */
function TimeColumn(props: {
	readonly label: string;
	readonly values: readonly number[];
	readonly selectedValue: number;
	readonly formatValue: (value: number) => string;
	readonly onSelect: (value: number) => void;
}): ReactElement {
	return (
		<div className="campfire-time-picker-column">
			<p className="campfire-time-picker-column-label">{props.label}</p>

			<div className="campfire-time-picker-option-list">
				{props.values.map(value => {
					const selected = value === props.selectedValue;

					return (
						<button
							key={value}
							type="button"
							className={cn(
								'campfire-time-picker-option',
								selected && 'campfire-time-picker-option--selected',
							)}
							aria-pressed={selected}
							onClick={() => props.onSelect(value)}
						>
							<span>{props.formatValue(value)}</span>
							{selected && <Check className="cf:size-4" />}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/**
 * parseTimeValue parses HH:MM into time parts.
 */
function parseTimeValue(value: string): TimeParts | null {
	const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

	if (match === null) {
		return null;
	}

	const hour = Number.parseInt(match[1] ?? '', 10);
	const minute = Number.parseInt(match[2] ?? '', 10);

	if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
		return null;
	}

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return null;
	}

	return {
		hour,
		minute: Math.round(minute / 5) * 5 === 60 ? 55 : Math.round(minute / 5) * 5,
	};
}

/**
 * formatTimeValue formats time parts as HH:MM.
 */
function formatTimeValue(hour: number, minute: number): string {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}