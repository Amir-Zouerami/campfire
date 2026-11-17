import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { addDays, normalizeDateInput, parseIsoDate, persianDateLabel, todayIn, toIsoDate } from '@/shared/lib/date';

import { usePortalContainer } from '../overlay/PortalContainer';
import { Icon } from '../primitives/Icon';
import { useUiSettings } from '../UiSettings';
import { CONTROL_CLASS, POPUP_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

type DateFieldProps = {
	/** A stored YYYY-MM-DD date, or an empty string. */
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	readonly disabled?: boolean;
	readonly label?: string;
	/** Earliest selectable date. */
	readonly min?: string;
	/** Latest selectable date. */
	readonly max?: string;
};

function toLocalDigits(value: string | number, locale: string): string {
	const str = String(value);
	if (locale === 'fa') {
		const faDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
		return str.replace(/[0-9]/g, d => faDigits[Number(d)] ?? d);
	}
	if (locale === 'ar') {
		const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
		return str.replace(/[0-9]/g, d => arDigits[Number(d)] ?? d);
	}
	return str;
}

function arabicDateLabel(value: string): string {
	const date = parseIsoDate(value);
	if (date === null) {
		return '';
	}

	try {
		return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}).format(date);
	} catch {
		return '';
	}
}

// Persian (Jalali) calculations
function getJalaliParts(date: Date): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		timeZone: 'UTC',
	}).formatToParts(date);
	return {
		year: parseInt(parts.find(p => p.type === 'year')?.value ?? '1400', 10),
		month: parseInt(parts.find(p => p.type === 'month')?.value ?? '1', 10),
		day: parseInt(parts.find(p => p.type === 'day')?.value ?? '1', 10),
	};
}

function getJalaliMonthStart(date: Date): Date {
	const { day } = getJalaliParts(date);
	return new Date(date.getTime() - (day - 1) * 86_400_000);
}

function addJalaliMonths(date: Date, delta: number): Date {
	const start = getJalaliMonthStart(date);
	const target = new Date(start.getTime() + (delta * 30 + 15) * 86_400_000);
	return getJalaliMonthStart(target);
}

// Arabic (Hijri) calculations
function getHijriParts(date: Date): { year: number; month: number; day: number } {
	const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		timeZone: 'UTC',
	}).formatToParts(date);
	return {
		year: parseInt(parts.find(p => p.type === 'year')?.value ?? '1440', 10),
		month: parseInt(parts.find(p => p.type === 'month')?.value ?? '1', 10),
		day: parseInt(parts.find(p => p.type === 'day')?.value ?? '1', 10),
	};
}

function getHijriMonthStart(date: Date): Date {
	const { day } = getHijriParts(date);
	return new Date(date.getTime() - (day - 1) * 86_400_000);
}

function addHijriMonths(date: Date, delta: number): Date {
	const start = getHijriMonthStart(date);
	const target = new Date(start.getTime() + (delta * 29.5 + 15) * 86_400_000);
	return getHijriMonthStart(target);
}

// Gregorian calculations
function getGregorianMonthStart(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function addGregorianMonths(date: Date, delta: number): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1, 12));
}

/**
 * gregorianSpan names the Gregorian month or months a Jalali or Hijri month covers, e.g. `Oct – Nov 2026`.
 */
function gregorianSpan(first: Date, last: Date): string {
	const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
	const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

	if (first.getUTCMonth() === last.getUTCMonth()) {
		return monthYear.format(first);
	}

	return first.getUTCFullYear() === last.getUTCFullYear()
		? `${month.format(first)} – ${monthYear.format(last)}`
		: `${monthYear.format(first)} – ${monthYear.format(last)}`;
}

function formatMonthHeader(date: Date, last: Date, locale: string, isPersian: boolean, isArabic: boolean): { main: string; sub?: string } {
	if (isPersian) {
		try {
			const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC',
			}).formatToParts(date);
			const monthName = parts.find(p => p.type === 'month')?.value ?? '';
			const year = parts.find(p => p.type === 'year')?.value ?? '';
			return { main: `${monthName} ${year}`.trim(), sub: gregorianSpan(date, last) };
		} catch {
			// fallback below
		}
	}

	if (isArabic) {
		try {
			const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC',
			}).formatToParts(date);
			const monthName = parts.find(p => p.type === 'month')?.value ?? '';
			const year = parts.find(p => p.type === 'year')?.value ?? '';
			return { main: `${monthName} ${year}`.trim(), sub: gregorianSpan(date, last) };
		} catch {
			// fallback below
		}
	}

	return {
		main: new Intl.DateTimeFormat(locale, {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}).format(date),
	};
}

/**
 * DateField stores Gregorian YYYY-MM-DD values. It features an interactive floating
 * calendar popover with strictly square day cells, native calendar month views
 * (Jalali for Persian, Hijri for Arabic, and pure Gregorian for English), and quick
 * shortcuts for Today and Yesterday.
 */
export function DateField(props: DateFieldProps): ReactElement {
	const control = useFieldControl();
	const container = usePortalContainer();
	const { locale, direction, t } = useI18n();
	const { alternateCalendar, weekStart } = useUiSettings();

	const isPersian = locale === 'fa' || alternateCalendar === 'persian';
	const isArabic = locale === 'ar';
	const hasSecondary = isPersian || isArabic;

	const todayIso = todayIn(null);
	const initialDate = parseIsoDate(props.value) ?? parseIsoDate(todayIso) ?? new Date();
	const [viewDate, setViewDate] = useState<Date>(initialDate);
	const [draft, setDraft] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	// The popup is anchored to the whole field, not the small trigger, so it lines up with the input.
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	// Determine calendar start, total days and weekday offset
	let monthStart: Date;
	let daysCount: number;
	let startOffset: number;

	if (isPersian) {
		monthStart = getJalaliMonthStart(viewDate);
		const nextStart = addJalaliMonths(monthStart, 1);
		daysCount = Math.round((nextStart.getTime() - monthStart.getTime()) / 86_400_000);
		startOffset = (monthStart.getUTCDay() - 6 + 7) % 7;
	} else if (isArabic) {
		monthStart = getHijriMonthStart(viewDate);
		const nextStart = addHijriMonths(monthStart, 1);
		daysCount = Math.round((nextStart.getTime() - monthStart.getTime()) / 86_400_000);
		startOffset = (monthStart.getUTCDay() - 6 + 7) % 7;
	} else {
		monthStart = getGregorianMonthStart(viewDate);
		const nextStart = addGregorianMonths(monthStart, 1);
		daysCount = Math.round((nextStart.getTime() - monthStart.getTime()) / 86_400_000);
		startOffset = (monthStart.getUTCDay() - (weekStart as number) + 7) % 7;
	}

	// Month header text
	const header = formatMonthHeader(monthStart, new Date(monthStart.getTime() + (daysCount - 1) * 86_400_000), locale, isPersian, isArabic);

	// Weekday columns
	const weekdays: readonly string[] = isPersian
		? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
		: isArabic
			? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']
			: (weekStart as number) === 0
				? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
				: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

	// Trailing days
	const trailingDays: { date: Date; label: string }[] = [];
	for (let i = startOffset; i > 0; i--) {
		const d = new Date(monthStart.getTime() - i * 86_400_000);
		const label = isPersian
			? toLocalDigits(getJalaliParts(d).day, 'fa')
			: isArabic
				? toLocalDigits(getHijriParts(d).day, 'ar')
				: String(d.getUTCDate());
		trailingDays.push({ date: d, label });
	}

	// Days of month
	const days: {
		date: Date;
		iso: string;
		primary: string;
		secondary?: string;
		isToday: boolean;
		isSelected: boolean;
		isDisabled: boolean;
	}[] = [];

	for (let i = 0; i < daysCount; i++) {
		const d = new Date(monthStart.getTime() + i * 86_400_000);
		const iso = toIsoDate(d);
		const primary = isPersian ? toLocalDigits(i + 1, 'fa') : isArabic ? toLocalDigits(i + 1, 'ar') : String(i + 1);
		const secondary = hasSecondary ? String(d.getUTCDate()) : undefined;
		const isToday = iso === todayIso;
		const isSelected = iso === props.value;
		const isDisabled = (props.min !== undefined && iso < props.min) || (props.max !== undefined && iso > props.max);
		days.push({ date: d, iso, primary, secondary, isToday, isSelected, isDisabled });
	}

	function commit(): void {
		if (draft === null) {
			return;
		}

		const normalized = draft.trim() === '' ? '' : normalizeDateInput(draft);
		if (normalized !== null) {
			props.onChange(normalized);
			const parsed = parseIsoDate(normalized);
			if (parsed !== null) {
				setViewDate(parsed);
			}
		}

		setDraft(null);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === 'Enter') {
			commit();
		}
	}

	function goToPrevMonth(): void {
		if (isPersian) {
			setViewDate(prev => addJalaliMonths(prev, -1));
		} else if (isArabic) {
			setViewDate(prev => addHijriMonths(prev, -1));
		} else {
			setViewDate(prev => addGregorianMonths(prev, -1));
		}
	}

	function goToNextMonth(): void {
		if (isPersian) {
			setViewDate(prev => addJalaliMonths(prev, 1));
		} else if (isArabic) {
			setViewDate(prev => addHijriMonths(prev, 1));
		} else {
			setViewDate(prev => addGregorianMonths(prev, 1));
		}
	}

	function selectDate(iso: string): void {
		props.onChange(iso);
		setDraft(null);
		const parsed = parseIsoDate(iso);
		if (parsed !== null) {
			setViewDate(parsed);
		}
		setOpen(false);
	}

	// Display value inside input
	let displayValue = props.value;
	if (draft !== null) {
		displayValue = draft;
	} else if (props.value !== '') {
		if (isPersian) {
			displayValue = persianDateLabel(props.value) || props.value;
		} else if (isArabic) {
			displayValue = arabicDateLabel(props.value) || props.value;
		}
	}

	const PrevIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;
	const NextIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

	return (
		<Popover.Root
			open={open}
			onOpenChange={nextOpen => {
				setOpen(nextOpen);
				if (nextOpen && props.value !== '') {
					const parsed = parseIsoDate(props.value);
					if (parsed !== null) {
						setViewDate(parsed);
					}
				}
			}}
		>
			<div ref={setAnchor} className="cf:relative cf:w-full">
				<span className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:start-3.5 cf:flex cf:items-center cf:text-muted">
					<Icon icon={CalendarDays} size="md" />
				</span>
				<input
					{...control}
					type="text"
					autoComplete="off"
					disabled={props.disabled}
					aria-label={props.label}
					placeholder={t('common.date.placeholder')}
					value={displayValue}
					onClick={() => {
						if (!props.disabled) {
							setOpen(true);
						}
					}}
					className={cn(
						CONTROL_CLASS,
						'cf:h-11 cf:ps-11 cf:cursor-pointer',
						hasSecondary && props.value !== '' && draft === null ? 'cf:pe-32' : 'cf:pe-11',
					)}
					onChange={event => setDraft(event.target.value)}
					onBlur={() => {
						commit();
						props.onBlur?.();
					}}
					onKeyDown={handleKeyDown}
				/>
				{hasSecondary && props.value !== '' && draft === null && (
					<span dir="ltr" className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:end-11 cf:flex cf:items-center cf:pe-2">
						<span className="cf:rounded-md cf:bg-sunken cf:px-2 cf:py-0.5 cf:text-[11px] cf:font-mono cf:text-subtle">{props.value}</span>
					</span>
				)}
				<Popover.Trigger
					disabled={props.disabled}
					aria-label={t('common.calendar')}
					className="cf:absolute cf:inset-y-0 cf:end-0 cf:grid cf:w-11 cf:cursor-pointer cf:appearance-none cf:place-items-center cf:rounded-control cf:border-0 cf:bg-transparent cf:p-0 cf:text-muted cf:hover:text-ink cf:focus-visible:outline-2 cf:focus-visible:outline-area"
				>
					<Icon icon={CalendarDays} size="sm" />
				</Popover.Trigger>
			</div>

			<Popover.Portal container={container}>
				<Popover.Positioner anchor={anchor} align="start" sideOffset={6} collisionPadding={16} className="cf:z-[100000]">
					<Popover.Popup className={cn(POPUP_CLASS, 'cf:w-80 cf:flex cf:flex-col cf:gap-3.5 cf:p-4')}>
						{/* Calendar Header */}
						<div className="cf:flex cf:items-center cf:justify-between cf:border-b cf:border-line cf:pb-3">
							<button
								type="button"
								onClick={goToPrevMonth}
								className="cf:grid cf:size-8 cf:cursor-pointer cf:place-items-center cf:rounded-lg cf:border cf:border-line cf:bg-surface cf:text-muted cf:transition-colors cf:hover:bg-sunken cf:hover:text-ink"
								aria-label={t('shared.date.previousMonth')}
							>
								<Icon icon={PrevIcon} size="sm" />
							</button>

							<div className="cf:flex cf:flex-col cf:items-center cf:justify-center">
								<span className="cf:text-sm cf:font-bold cf:text-ink">{header.main}</span>
								{header.sub !== undefined && (
									<span dir="ltr" className="cf:text-[11px] cf:font-medium cf:text-muted">
										{header.sub}
									</span>
								)}
							</div>

							<button
								type="button"
								onClick={goToNextMonth}
								className="cf:grid cf:size-8 cf:cursor-pointer cf:place-items-center cf:rounded-lg cf:border cf:border-line cf:bg-surface cf:text-muted cf:transition-colors cf:hover:bg-sunken cf:hover:text-ink"
								aria-label={t('shared.date.nextMonth')}
							>
								<Icon icon={NextIcon} size="sm" />
							</button>
						</div>

						{/* Weekday Labels */}
						<div className="cf:grid cf:grid-cols-7 cf:gap-1.5 cf:text-center cf:text-xs cf:font-bold cf:text-subtle cf:py-1">
							{weekdays.map((w, idx) => (
								<span
									key={`${w}-${idx}`}
									className={cn(
										'cf:aspect-square cf:flex cf:items-center cf:justify-center',
										(isPersian || isArabic) && idx === 6 && 'cf:text-blue-ink',
									)}
								>
									{w}
								</span>
							))}
						</div>

						{/* Days Grid (Strict 1:1 Squares) */}
						<div className="cf:grid cf:grid-cols-7 cf:gap-1.5 cf:text-center">
							{trailingDays.map((td, index) => (
								<div
									key={`trail-${index}`}
									className="cf:aspect-square cf:rounded-xl cf:flex cf:flex-col cf:items-center cf:justify-center cf:text-subtle/35 cf:select-none"
								>
									<span className="cf:text-xs">{td.label}</span>
								</div>
							))}

							{days.map(d => (
								<button
									key={d.iso}
									type="button"
									disabled={d.isDisabled}
									onClick={() => selectDate(d.iso)}
									className={cn(
										'cf:relative cf:m-0 cf:flex cf:aspect-square cf:cursor-pointer cf:appearance-none cf:flex-col cf:items-center cf:justify-center cf:rounded-xl cf:border cf:p-0 cf:transition-all',
										d.isSelected
											? 'cf:border-transparent cf:bg-blue cf:font-bold cf:text-on-brand cf:shadow-lg cf:shadow-blue/20 cf:ring-2 cf:ring-blue/60'
											: 'cf:border-transparent cf:bg-transparent cf:text-ink cf:hover:border-line cf:hover:bg-sunken',
										d.isDisabled && 'cf:opacity-30 cf:pointer-events-none',
									)}
								>
									<span className={cn('cf:text-sm cf:font-bold cf:leading-none', d.isSelected ? 'cf:text-on-brand' : 'cf:text-ink')}>
										{d.primary}
									</span>
									{d.secondary !== undefined && (
										<span
											className={cn(
												'cf:text-[9px] cf:font-mono cf:leading-none cf:mt-0.5',
												d.isSelected ? 'cf:text-on-brand/80' : 'cf:text-subtle',
											)}
										>
											{d.secondary}
										</span>
									)}
									{d.isToday && !d.isSelected && <span className="cf:size-1 cf:rounded-full cf:bg-blue cf:absolute cf:bottom-1" />}
								</button>
							))}
						</div>

						{/* Shortcuts Footer */}
						<div className="cf:flex cf:items-center cf:justify-between cf:pt-3 cf:border-t cf:border-line cf:text-xs cf:font-semibold">
							<button
								type="button"
								onClick={() => selectDate(todayIso)}
								className="cf:m-0 cf:cursor-pointer cf:appearance-none cf:border-0 cf:bg-transparent cf:p-0 cf:text-blue-ink cf:hover:underline"
							>
								{t('common.today')}
							</button>
							<button
								type="button"
								onClick={() => selectDate(addDays(todayIso, -1))}
								className="cf:m-0 cf:cursor-pointer cf:appearance-none cf:border-0 cf:bg-transparent cf:p-0 cf:text-muted cf:hover:text-ink"
							>
								{t('common.yesterday')}
							</button>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="cf:m-0 cf:cursor-pointer cf:appearance-none cf:rounded-lg cf:border-0 cf:bg-sunken cf:px-3 cf:py-1.5 cf:text-ink cf:transition-colors cf:hover:bg-line-strong"
							>
								{t('common.done')}
							</button>
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
