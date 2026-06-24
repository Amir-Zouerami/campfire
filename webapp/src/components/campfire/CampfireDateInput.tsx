import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KeyboardEvent, ReactElement } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { normalizeISODateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
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
	readonly workingDays?: readonly number[];
	readonly weekStartsOn?: number;
	readonly onValueChange: (value: string) => void;
};

/**
 * CalendarSystem identifies the user-facing calendar rendered by the picker.
 * The stored value remains Gregorian YYYY-MM-DD for all calendars.
 */
type CalendarSystem = 'gregorian' | 'persian';

/**
 * CalendarDayCell describes one visible calendar day.
 */
type CalendarDayCell = {
	readonly key: string;
	readonly dateValue: string;
	readonly dayNumber: string;
	readonly inCurrentMonth: boolean;
	readonly selected: boolean;
	readonly today: boolean;
	readonly alternativeTitle: string;
};

/**
 * CalendarParts contains numeric calendar fields in the active display calendar.
 */
type CalendarParts = {
	readonly year: number;
	readonly month: number;
	readonly day: number;
};

/**
 * MONTH_NAMES contains Gregorian fallback month labels.
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
 * WEEKDAY_NAMES contains compact Gregorian fallback weekday labels.
 */
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * CampfireDateInput renders a custom styled date picker.
 */
export function CampfireDateInput(props: CampfireDateInputProps): ReactElement {
	const { direction, htmlLang, t } = useI18n();
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const popoverRef = useRef<HTMLDivElement | null>(null);
	const selectedDate = parseDateValue(props.value);
	const displayCalendar = useMemo(() => resolveDisplayCalendar(htmlLang), [htmlLang]);
	const [open, setOpen] = useState(false);
	const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfDisplayMonth(selectedDate ?? new Date(), displayCalendar));

	useEffect(() => {
		const nextSelectedDate = parseDateValue(props.value);
		if (nextSelectedDate !== null) {
			setVisibleMonth(startOfDisplayMonth(nextSelectedDate, displayCalendar));
		}
	}, [props.value, displayCalendar]);

	useEffect(() => {
		setVisibleMonth(month => startOfDisplayMonth(month, displayCalendar));
	}, [displayCalendar]);

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

	const weekStartsOn = useMemo(() => {
		return resolveWeekStartsOn(props.weekStartsOn, props.workingDays, props.timezone, htmlLang);
	}, [props.weekStartsOn, props.workingDays, props.timezone, htmlLang]);

	const cells = useMemo(() => {
		return buildCalendarCells(visibleMonth, selectedDate, weekStartsOn, htmlLang, displayCalendar);
	}, [visibleMonth, selectedDate, weekStartsOn, htmlLang, displayCalendar]);

	const visibleMonthLabel = useMemo(() => {
		return formatLocalizedMonthName(visibleMonth, htmlLang, displayCalendar);
	}, [visibleMonth, htmlLang, displayCalendar]);

	const visibleYearLabel = useMemo(() => {
		return formatLocalizedYear(visibleMonth, htmlLang, displayCalendar);
	}, [visibleMonth, htmlLang, displayCalendar]);

	const weekdayLabels = useMemo(() => {
		return buildLocalizedWeekdayLabels(htmlLang, weekStartsOn);
	}, [htmlLang, weekStartsOn]);

	const triggerDisplayValue = useMemo(() => {
		return formatDateTriggerValue(props.value, htmlLang, displayCalendar);
	}, [props.value, htmlLang, displayCalendar]);

	const triggerSecondaryValue = useMemo(() => {
		return displayCalendar === 'persian' && props.value.trim() !== '' ? props.value : '';
	}, [displayCalendar, props.value]);

	const hoverTitle = useMemo(() => {
		return buildAlternativeDateTitle(props.value, htmlLang, displayCalendar);
	}, [props.value, htmlLang, displayCalendar]);

	const floatingPopover = useCampfireFloatingPopover({
		open,
		triggerRef: buttonRef,
		popoverRef,
		placement: 'bottom-end',
	});
	const PreviousMonthIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
	const NextMonthIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

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

	const popover = (
		<div
			ref={popoverRef}
			role="dialog"
			dir={direction}
			lang={htmlLang}
			aria-label={t('shared.date.choose')}
			className="campfire-picker-portal-scope campfire-date-picker-popover campfire-floating-popover"
			data-calendar={displayCalendar}
			data-week-start={weekStartsOn}
			style={floatingPopover.style}
		>
			<div className="campfire-date-picker-glow" />

			<div className="campfire-date-picker-header">
				<button
					type="button"
					className="campfire-date-picker-nav-button"
					aria-label={t('shared.date.previousMonth')}
					onClick={() => setVisibleMonth(month => addDisplayMonths(month, -1, displayCalendar))}
				>
					<PreviousMonthIcon className="cf:size-5" />
				</button>

				<div className="campfire-date-picker-heading">
					<p className="campfire-date-picker-month">{visibleMonthLabel}</p>
					<p className="campfire-date-picker-year">{visibleYearLabel}</p>
				</div>

				<button
					type="button"
					className="campfire-date-picker-nav-button"
					aria-label={t('shared.date.nextMonth')}
					onClick={() => setVisibleMonth(month => addDisplayMonths(month, 1, displayCalendar))}
				>
					<NextMonthIcon className="cf:size-5" />
				</button>
			</div>

			<div className="campfire-date-picker-weekdays">
				{weekdayLabels.map(day => (
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
						data-alt-title={cell.alternativeTitle || undefined}
						aria-label={cell.alternativeTitle === '' ? cell.dayNumber : `${cell.dayNumber} — ${cell.alternativeTitle}`}
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
					{t('common.today')}
				</button>

				<button
					type="button"
					className="campfire-date-picker-footer-button"
					onClick={() => setOpen(false)}
				>
					{t('common.close')}
				</button>
			</div>
		</div>
	);

	return (
		<div ref={rootRef} className={cn('campfire-date-picker', props.className)}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				title={hoverTitle === '' ? undefined : hoverTitle}
				disabled={props.disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				className={cn('campfire-date-picker-trigger', open && 'campfire-date-picker-trigger--open')}
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
						{props.value.trim() === '' ? t('common.date.placeholder') : triggerDisplayValue}
					</span>

					{triggerSecondaryValue !== '' && (
						<span className="campfire-date-picker-hint" dir={direction}>
							<bdi className="campfire-date-picker-hint-calendar" dir="ltr">
								{triggerSecondaryValue}
							</bdi>
						</span>
					)}
				</span>

				<span className="campfire-date-picker-trigger-icon">
					<CalendarDays className="cf:size-5" />
				</span>
			</button>

			{open && floatingPopover.portalHost !== null && createPortal(popover, floatingPopover.portalHost)}
		</div>
	);
}

/**
 * buildAlternativeDateTitle returns a native browser tooltip only when the
 * visible calendar is not the user's operational calendar. Persian shows the
 * canonical Gregorian date; Arabic keeps the Gregorian picker but exposes an
 * Islamic-calendar hint on hover.
 */
function buildAlternativeDateTitle(dateValue: string, locale: string, calendar: CalendarSystem): string {
	const date = parseDateValue(dateValue);
	if (date === null) {
		return '';
	}

	if (calendar === 'persian') {
		return formatDateValue(date);
	}

	if (locale.toLowerCase().startsWith('ar')) {
		try {
			return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
				day: 'numeric',
				month: 'long',
				year: 'numeric',
			}).format(date);
		} catch (_error: unknown) {
			return '';
		}
	}

	return '';
}

/**
 * resolveDisplayCalendar enables a true Persian picker for Persian UI only.
 * Arabic deliberately remains Gregorian per product direction.
 */
function resolveDisplayCalendar(locale: string): CalendarSystem {
	return locale.toLowerCase().startsWith('fa') ? 'persian' : 'gregorian';
}

/**
 * formatLocalizedMonthName returns a month label in the active display calendar.
 */
function formatLocalizedMonthName(date: Date, locale: string, calendar: CalendarSystem): string {
	try {
		return new Intl.DateTimeFormat(displayCalendarLocale(locale, calendar), { month: 'long' }).format(date);
	} catch (_error: unknown) {
		return MONTH_NAMES[date.getMonth()] ?? MONTH_NAMES[0];
	}
}

/**
 * formatLocalizedYear returns a year label using locale digits when available.
 */
function formatLocalizedYear(date: Date, locale: string, calendar: CalendarSystem): string {
	try {
		return new Intl.DateTimeFormat(displayCalendarLocale(locale, calendar), { year: 'numeric' }).format(date);
	} catch (_error: unknown) {
		return String(date.getFullYear());
	}
}

/**
 * formatDateTriggerValue returns the localized visible value for the trigger.
 */
function formatDateTriggerValue(value: string, locale: string, calendar: CalendarSystem): string {
	const date = parseDateValue(value);
	if (date === null) {
		return value.trim();
	}

	if (calendar !== 'persian') {
		return formatDateValue(date);
	}

	try {
		return new Intl.DateTimeFormat(displayCalendarLocale(locale, calendar), {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	} catch (_error: unknown) {
		return formatDateValue(date);
	}
}

/**
 * buildLocalizedWeekdayLabels returns compact labels starting from the workspace workweek.
 */
function buildLocalizedWeekdayLabels(locale: string, weekStartsOn: number): readonly string[] {
	const weekdayIndexes = orderedWeekdays(weekStartsOn);

	try {
		const formatter = new Intl.DateTimeFormat(gregorianLocale(locale), {
			timeZone: 'UTC',
			weekday: 'short',
		});

		return weekdayIndexes.map(index => {
			const baseSunday = new Date(Date.UTC(2024, 0, 7 + index, 12, 0, 0));

			return formatter.format(baseSunday);
		});
	} catch (_error: unknown) {
		return weekdayIndexes.map(index => WEEKDAY_NAMES[index] ?? WEEKDAY_NAMES[0]);
	}
}

/**
 * orderedWeekdays returns weekday indexes starting from the workspace workweek.
 */
function orderedWeekdays(weekStartsOn: number): readonly number[] {
	return Array.from({ length: 7 }, (_value, index) => (weekStartsOn + index) % 7);
}

/**
 * resolveWeekStartsOn prefers explicit workspace working days, then timezone.
 */
function resolveWeekStartsOn(
	weekStartsOn: number | undefined,
	workingDays: readonly number[] | undefined,
	timezone: string | undefined,
	locale: string,
): number {
	const explicitWeekStart = normalizeWeekday(weekStartsOn);
	if (explicitWeekStart !== null) {
		return explicitWeekStart;
	}

	const workingWeekStart = firstWorkingWeekday(workingDays, locale, timezone);
	if (workingWeekStart !== null) {
		return workingWeekStart;
	}

	return defaultWeekStartForTimezone(timezone, locale);
}

/**
 * firstWorkingWeekday returns the first enabled day in the locale workweek order.
 */
function firstWorkingWeekday(
	workingDays: readonly number[] | undefined,
	locale: string,
	timezone: string | undefined,
): number | null {
	const enabled = new Set<number>();
	for (const weekday of workingDays ?? []) {
		const normalizedWeekday = normalizeWeekday(weekday);
		if (normalizedWeekday !== null) {
			enabled.add(normalizedWeekday);
		}
	}

	if (enabled.size === 0 || enabled.size === 7) {
		return null;
	}

	for (const weekday of workweekPreference(locale, timezone)) {
		if (enabled.has(weekday)) {
			return weekday;
		}
	}

	return Math.min(...enabled);
}

/**
 * workweekPreference lists weekday ordering for locating a workspace's first workday.
 */
function workweekPreference(locale: string, timezone: string | undefined): readonly number[] {
	const cleanTimezone = timezone?.trim().toLowerCase() ?? '';
	if (locale.toLowerCase().startsWith('fa') || cleanTimezone === 'asia/tehran') {
		return [6, 0, 1, 2, 3, 4, 5];
	}

	return [0, 1, 2, 3, 4, 5, 6];
}

/**
 * normalizeWeekday validates Go/Mattermost weekday numbering.
 */
function normalizeWeekday(value: number | undefined): number | null {
	if (value === undefined || !Number.isInteger(value) || value < 0 || value > 6) {
		return null;
	}

	return value;
}

/**
 * defaultWeekStartForTimezone is a fallback before workspace settings load.
 */
function defaultWeekStartForTimezone(timezone: string | undefined, locale: string): number {
	const normalizedTimezone = timezone?.trim().toLowerCase() ?? '';
	if (locale.toLowerCase().startsWith('fa') || normalizedTimezone === 'asia/tehran') {
		return 6;
	}

	return 0;
}

/**
 * gregorianLocale keeps Gregorian labels explicit for non-Persian calendars.
 */
function gregorianLocale(locale: string): string {
	if (locale.trim() === '') {
		return 'en-US-u-ca-gregory';
	}

	if (locale.includes('-u-')) {
		return locale;
	}

	return `${locale}-u-ca-gregory`;
}

/**
 * displayCalendarLocale returns an Intl locale for the visual calendar only.
 */
function displayCalendarLocale(locale: string, calendar: CalendarSystem): string {
	if (calendar === 'persian') {
		return 'fa-IR-u-ca-persian';
	}

	return gregorianLocale(locale);
}

/**
 * calendarPartsLocale returns ASCII numeric parts for calendar calculations.
 */
function calendarPartsLocale(calendar: CalendarSystem): string {
	return calendar === 'persian' ? 'fa-IR-u-ca-persian-nu-latn' : 'en-US-u-ca-gregory-nu-latn';
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
function buildCalendarCells(
	visibleMonth: Date,
	selectedDate: Date | null,
	weekStartsOn: number,
	locale: string,
	calendar: CalendarSystem,
): readonly CalendarDayCell[] {
	const todayValue = formatDateValue(new Date());
	const selectedValue = selectedDate === null ? '' : formatDateValue(selectedDate);
	const firstVisibleDate = startOfCalendarGrid(visibleMonth, weekStartsOn);
	const currentMonthKey = calendarMonthKey(visibleMonth, calendar);
	const cells: CalendarDayCell[] = [];

	for (let index = 0; index < 42; index += 1) {
		const date = addDays(firstVisibleDate, index);
		const dateValue = formatDateValue(date);

		cells.push({
			key: dateValue,
			dateValue,
			dayNumber: formatLocalizedDayNumber(date, locale, calendar),
			alternativeTitle: buildAlternativeDateTitle(dateValue, locale, calendar),
			inCurrentMonth: calendarMonthKey(date, calendar) === currentMonthKey,
			selected: dateValue === selectedValue,
			today: dateValue === todayValue,
		});
	}

	return cells;
}

/**
 * formatLocalizedDayNumber returns a localized day number for one date cell.
 */
function formatLocalizedDayNumber(date: Date, locale: string, calendar: CalendarSystem): string {
	if (calendar === 'persian') {
		const parts = calendarParts(date, calendar);
		return new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(parts.day);
	}

	try {
		return new Intl.NumberFormat(gregorianLocale(locale), { useGrouping: false }).format(date.getDate());
	} catch (_error: unknown) {
		return String(date.getDate());
	}
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
 * startOfDisplayMonth returns the first Gregorian date shown for the active calendar month.
 */
function startOfDisplayMonth(date: Date, calendar: CalendarSystem): Date {
	if (calendar === 'gregorian') {
		return startOfMonth(date);
	}

	const parts = calendarParts(date, calendar);
	return addDays(date, 1 - parts.day);
}

/**
 * startOfMonth returns the first local day of the Gregorian month.
 */
function startOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * startOfCalendarGrid returns the first visible day in the calendar grid.
 */
function startOfCalendarGrid(date: Date, weekStartsOn: number): Date {
	const firstDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const leadingDays = (firstDay.getDay() - weekStartsOn + 7) % 7;

	return addDays(firstDay, -leadingDays);
}

/**
 * addDisplayMonths moves by one or more months in the active calendar.
 */
function addDisplayMonths(date: Date, months: number, calendar: CalendarSystem): Date {
	if (calendar === 'gregorian') {
		return addMonths(date, months);
	}

	let result = startOfDisplayMonth(date, calendar);
	const direction = months >= 0 ? 1 : -1;
	const count = Math.abs(months);

	for (let index = 0; index < count; index += 1) {
		result = direction > 0
			? startOfDisplayMonth(addDays(result, 31), calendar)
			: startOfDisplayMonth(addDays(result, -1), calendar);
	}

	return result;
}

/**
 * addMonths returns a Gregorian date moved by whole Gregorian months.
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
 * calendarParts returns numeric year/month/day for the active display calendar.
 */
function calendarParts(date: Date, calendar: CalendarSystem): CalendarParts {
	if (calendar === 'gregorian') {
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
		};
	}

	try {
		const formatter = new Intl.DateTimeFormat(calendarPartsLocale(calendar), {
			day: 'numeric',
			month: 'numeric',
			year: 'numeric',
		});
		const parts = formatter.formatToParts(date);

		return {
			year: parseCalendarNumber(parts.find(part => part.type === 'year')?.value ?? ''),
			month: parseCalendarNumber(parts.find(part => part.type === 'month')?.value ?? ''),
			day: parseCalendarNumber(parts.find(part => part.type === 'day')?.value ?? ''),
		};
	} catch (_error: unknown) {
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
		};
	}
}

/**
 * parseCalendarNumber parses ASCII Intl parts produced with nu-latn.
 */
function parseCalendarNumber(value: string): number {
	const parsed = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
	return Number.isFinite(parsed) ? parsed : 1;
}

/**
 * calendarMonthKey returns a stable year-month key for the active calendar.
 */
function calendarMonthKey(date: Date, calendar: CalendarSystem): string {
	const parts = calendarParts(date, calendar);
	return `${parts.year}-${parts.month}`;
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