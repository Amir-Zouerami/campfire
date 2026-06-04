import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { normalizeISODateInputValue } from '@/lib/dates';
import { formatWorkspaceDateHint } from '@/lib/calendarLabels';
import { cn } from '@/lib/utils';
import { useCampfireFloatingPopover } from './useCampfireFloatingPopover';

/**
 * CampfireDateInputProps contains a custom Campfire date picker.
 */
type CampfireDateInputProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly timezone?: string;
	readonly onValueChange: (value: string) => void;
};

/**
 * CalendarDayCell describes one visible calendar day.
 */
type CalendarDayCell = {
	readonly key: string;
	readonly dateValue: string;
	readonly dayNumber: number;
	readonly inCurrentMonth: boolean;
	readonly selected: boolean;
	readonly today: boolean;
};

/**
 * AlternateCalendarHintParts keeps RTL calendar text isolated from English labels.
 */
type AlternateCalendarHintParts = {
	readonly label: string;
	readonly calendarDate: string;
};

/**
 * MONTH_NAMES contains month labels.
 */
const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

/**
 * WEEKDAY_NAMES contains compact weekday labels.
 */
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * CampfireDateInput renders a custom styled date picker.
 */
export function CampfireDateInput(props: CampfireDateInputProps): ReactElement {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const selectedDate = parseDateValue(props.value);
	const [open, setOpen] = useState(false);
	const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(selectedDate ?? new Date()));

	useEffect(() => {
		if (selectedDate !== null) {
			setVisibleMonth(startOfMonth(selectedDate));
		}
	}, [props.value]);

	useEffect(() => {
		if (!open) {
			return;
		}

		/**
		 * handlePointerDown closes the picker when clicking outside.
		 */
		function handlePointerDown(event: PointerEvent): void {
			if (rootRef.current === null || event.target === null) {
				return;
			}

			if (!rootRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [open]);

	const cells = useMemo(() => {
		return buildCalendarCells(visibleMonth, selectedDate);
	}, [visibleMonth, selectedDate]);

	const alternateCalendarHintParts = useMemo(() => {
		return splitAlternateCalendarHint(formatWorkspaceDateHint(props.value, props.timezone));
	}, [props.value, props.timezone]);

	const popoverStyle = useCampfireFloatingPopover({
		open,
		triggerRef: buttonRef,
		popoverRef,
		placement: 'bottom-end',
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
	 * selectDate picks one visible date.
	 */
	function selectDate(dateValue: string): void {
		props.onValueChange(normalizeISODateInputValue(dateValue));
		setOpen(false);
	}

	return (
		<div ref={rootRef} className={cn('campfire-date-picker', props.className)}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				disabled={props.disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cn('campfire-control-trigger campfire-date-picker-trigger', open && 'campfire-date-picker-trigger--open')}
				onClick={() => setOpen(current => !current)}
				onKeyDown={handleKeyDown}
			>
				<span className="campfire-date-picker-value-stack">
					<span
						className={cn(
							'campfire-date-picker-value',
							props.value.trim() === '' && 'campfire-date-picker-value--empty',
						)}
					>
						{props.value.trim() === '' ? 'YYYY-MM-DD' : props.value}
					</span>

					{alternateCalendarHintParts !== null && (
						<span className="campfire-date-picker-hint" dir="ltr">
							(<span className="campfire-date-picker-hint-label">{alternateCalendarHintParts.label}: </span>
							<bdi className="campfire-date-picker-hint-calendar" dir="rtl">
								{alternateCalendarHintParts.calendarDate}
							</bdi>)
						</span>
					)}
				</span>

				<span className="campfire-date-picker-trigger-icon">
					<CalendarDays className="cf:size-5" />
				</span>
			</button>

			{open && (
				<div
					ref={popoverRef}
					role="dialog"
					aria-label="Choose date"
					className="campfire-date-picker-popover campfire-floating-popover"
					style={popoverStyle}
				>
					<div className="campfire-date-picker-glow" />

					<div className="campfire-date-picker-header">
						<button
							type="button"
							className="campfire-date-picker-nav-button"
							aria-label="Previous month"
							onClick={() => setVisibleMonth(month => addMonths(month, -1))}
						>
							<ChevronLeft className="cf:size-5" />
						</button>

						<div className="campfire-date-picker-heading">
							<p className="campfire-date-picker-month">{MONTH_NAMES[visibleMonth.getMonth()]}</p>
							<p className="campfire-date-picker-year">{visibleMonth.getFullYear()}</p>
						</div>

						<button
							type="button"
							className="campfire-date-picker-nav-button"
							aria-label="Next month"
							onClick={() => setVisibleMonth(month => addMonths(month, 1))}
						>
							<ChevronRight className="cf:size-5" />
						</button>
					</div>

					<div className="campfire-date-picker-weekdays">
						{WEEKDAY_NAMES.map(day => (
							<div key={day} className="campfire-date-picker-weekday">
								{day}
							</div>
						))}
					</div>

					<div className="campfire-date-picker-grid">
						{cells.map(cell => (
							<button
								key={cell.key}
								type="button"
								className={calendarDayClassName(cell)}
								aria-pressed={cell.selected}
								onClick={() => selectDate(cell.dateValue)}
							>
								<span>{cell.dayNumber}</span>
							</button>
						))}
					</div>

					<div className="campfire-date-picker-footer">
						<button
							type="button"
							className="campfire-date-picker-footer-button campfire-date-picker-footer-button--primary"
							onClick={() => selectDate(formatDateValue(new Date()))}
						>
							Today
						</button>

						<button
							type="button"
							className="campfire-date-picker-footer-button"
							onClick={() => setOpen(false)}
						>
							Close
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * splitAlternateCalendarHint separates the English label from RTL calendar text.
 *
 * Rendering the pieces separately prevents Persian/Arabic day, month, and year
 * text from visually reordering when it is placed beside an English label.
 */
function splitAlternateCalendarHint(hint: string): AlternateCalendarHintParts | null {
	const cleanHint = hint.trim();
	if (cleanHint === '') {
		return null;
	}

	const separatorIndex = cleanHint.indexOf(':');
	if (separatorIndex < 0) {
		return {
			label: 'Calendar',
			calendarDate: cleanHint,
		};
	}

	const label = cleanHint.slice(0, separatorIndex).trim();
	const calendarDate = cleanHint.slice(separatorIndex + 1).trim();

	if (label === '' || calendarDate === '') {
		return {
			label: 'Calendar',
			calendarDate: cleanHint,
		};
	}

	return {
		label,
		calendarDate,
	};
}

/**
 * calendarDayClassName returns styles for one day cell.
 */
function calendarDayClassName(cell: CalendarDayCell): string {
	return cn(
		'campfire-date-picker-day',
		!cell.inCurrentMonth && 'campfire-date-picker-day--muted',
		cell.today && 'campfire-date-picker-day--today',
		cell.selected && 'campfire-date-picker-day--selected',
	);
}

/**
 * buildCalendarCells returns six weeks of visible calendar days.
 */
function buildCalendarCells(visibleMonth: Date, selectedDate: Date | null): readonly CalendarDayCell[] {
	const todayValue = formatDateValue(new Date());
	const selectedValue = selectedDate === null ? '' : formatDateValue(selectedDate);
	const firstVisibleDate = startOfCalendarGrid(visibleMonth);
	const cells: CalendarDayCell[] = [];

	for (let index = 0; index < 42; index += 1) {
		const date = addDays(firstVisibleDate, index);
		const dateValue = formatDateValue(date);

		cells.push({
			key: dateValue,
			dateValue,
			dayNumber: date.getDate(),
			inCurrentMonth:
				date.getMonth() === visibleMonth.getMonth() && date.getFullYear() === visibleMonth.getFullYear(),
			selected: dateValue === selectedValue,
			today: dateValue === todayValue,
		});
	}

	return cells;
}

/**
 * parseDateValue parses YYYY-MM-DD into a safe local Date.
 */
function parseDateValue(value: string): Date | null {
	const normalizedValue = normalizeISODateInputValue(value);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
		return null;
	}

	const [yearRaw, monthRaw, dayRaw] = normalizedValue.split('-');
	const year = Number.parseInt(yearRaw ?? '', 10);
	const month = Number.parseInt(monthRaw ?? '', 10);
	const day = Number.parseInt(dayRaw ?? '', 10);

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		return null;
	}

	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}

	return date;
}

/**
 * startOfMonth returns the first local day of the month.
 */
function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * startOfCalendarGrid returns the first visible day in the calendar grid.
 */
function startOfCalendarGrid(date: Date): Date {
	const firstDay = startOfMonth(date);

	return addDays(firstDay, -firstDay.getDay());
}

/**
 * addMonths returns a date moved by whole months.
 */
function addMonths(date: Date, months: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/**
 * addDays returns a date moved by whole days.
 */
function addDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * formatDateValue formats a local Date as YYYY-MM-DD.
 */
function formatDateValue(date: Date): string {
	const year = String(date.getFullYear());
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}
