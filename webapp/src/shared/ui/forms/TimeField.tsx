import { Popover } from '@base-ui/react/popover';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { minutesToTimeOfDay, normalizeTimeInput, timeOfDayToMinutes } from '@/shared/lib/duration';

import { usePortalContainer } from '../overlay/PortalContainer';
import { Icon } from '../primitives/Icon';
import { CONTROL_CLASS, POPUP_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

const WORKDAY_PRESETS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '17:00', '18:00'] as const;

type TimeFieldProps = {
	/** A 24-hour HH:mm time, or an empty string. */
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onBlur?: () => void;
	readonly placeholder?: string;
	readonly disabled?: boolean;
	readonly label?: string;
	/** Arrow-key step in minutes. */
	readonly step?: number;
};

/**
 * TimeField is an interactive 24-hour time picker. It supports direct typed entry (normalizing
 * values like "930" to "09:30" on blur and stepping via arrow keys) as well as an interactive
 * floating popover with common workday presets and hour/minute columns.
 */
export function TimeField(props: TimeFieldProps): ReactElement {
	const control = useFieldControl();
	const container = usePortalContainer();
	const { t } = useI18n();
	const [draft, setDraft] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	// The popup is anchored to the whole field, not the small trigger, so it lines up with the input.
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const step = props.step ?? 5;

	const effectiveValue = normalizeTimeInput(draft ?? props.value) ?? props.value;
	const [hourPart, minutePart] = effectiveValue.includes(':') ? effectiveValue.split(':') : ['09', '00'];
	const currentHour = (hourPart ?? '09').padStart(2, '0');
	const currentMinute = (minutePart ?? '00').padStart(2, '0');

	function commit(): void {
		if (draft === null) {
			return;
		}

		const normalized = draft.trim() === '' ? '' : normalizeTimeInput(draft);
		if (normalized !== null) {
			props.onChange(normalized);
		}

		setDraft(null);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
		if (event.key === 'Enter') {
			commit();
			return;
		}

		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
			return;
		}

		event.preventDefault();
		const direction = event.key === 'ArrowUp' ? 1 : -1;
		const amount = (event.shiftKey ? 60 : step) * direction;
		const base = timeOfDayToMinutes(normalizeTimeInput(draft ?? props.value) ?? '') ?? 0;

		props.onChange(minutesToTimeOfDay(base + amount));
		setDraft(null);
	}

	function setHour(h: string): void {
		const next = `${h.padStart(2, '0')}:${currentMinute}`;
		props.onChange(next);
		setDraft(null);
	}

	function setMinute(m: string): void {
		const next = `${currentHour}:${m.padStart(2, '0')}`;
		props.onChange(next);
		setDraft(null);
	}

	function setNow(): void {
		const now = new Date();
		const h = String(now.getHours()).padStart(2, '0');
		const nearest5 = Math.round(now.getMinutes() / 5) * 5;
		const m = String(nearest5 >= 60 ? 55 : nearest5).padStart(2, '0');
		props.onChange(`${h}:${m}`);
		setDraft(null);
	}

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<div ref={setAnchor} className="cf:relative cf:w-full">
				<span className="cf:pointer-events-none cf:absolute cf:inset-y-0 cf:start-3.5 cf:flex cf:items-center cf:text-muted">
					<Icon icon={Clock} size="md" />
				</span>
				<input
					{...control}
					type="text"
					inputMode="numeric"
					autoComplete="off"
					disabled={props.disabled}
					aria-label={props.label}
					placeholder={props.placeholder ?? t('common.time.placeholder')}
					value={draft ?? props.value}
					className={cn(CONTROL_CLASS, 'cf:h-11 cf:cursor-pointer cf:ps-11 cf:pe-24 cf:font-mono')}
					onClick={() => {
						if (!props.disabled) {
							setOpen(true);
						}
					}}
					onChange={event => setDraft(event.target.value)}
					onBlur={() => {
						commit();
						props.onBlur?.();
					}}
					onKeyDown={handleKeyDown}
				/>
				<Popover.Trigger
					disabled={props.disabled}
					aria-label={t('common.change')}
					className="cf:absolute cf:inset-y-1.5 cf:end-1.5 cf:flex cf:cursor-pointer cf:appearance-none cf:items-center cf:gap-1.5 cf:rounded-lg cf:border cf:border-line cf:bg-surface cf:px-2.5 cf:text-xs cf:font-semibold cf:text-muted cf:transition-colors cf:hover:bg-sunken cf:hover:text-ink cf:focus-visible:outline-2 cf:focus-visible:outline-area"
				>
					<span>{t('common.change')}</span>
				</Popover.Trigger>
			</div>

			<Popover.Portal container={container}>
				<Popover.Positioner anchor={anchor} align="start" sideOffset={6} collisionPadding={16} className="cf:z-[100000]">
					<Popover.Popup className={cn(POPUP_CLASS, 'cf:w-80 cf:flex cf:flex-col cf:gap-3.5 cf:p-4')}>
						{/* Selected Time Display & "Now" button */}
						<div className="cf:flex cf:items-center cf:justify-between cf:border-b cf:border-line cf:pb-3">
							<div className="cf:flex cf:items-baseline cf:gap-2">
								<span className="cf:text-xl cf:font-extrabold cf:font-mono cf:tracking-wider cf:text-blue-ink">
									{props.value.trim() !== '' ? props.value : '09:00'}
								</span>
							</div>
							<button
								type="button"
								onClick={setNow}
								className="cf:flex cf:cursor-pointer cf:items-center cf:gap-1.5 cf:rounded-lg cf:border cf:border-blue/20 cf:bg-blue-soft cf:px-3 cf:py-1 cf:text-xs cf:font-semibold cf:text-blue-ink cf:transition-all cf:hover:brightness-110"
							>
								<Icon icon={Clock} size="sm" />
								<span>{t('common.now')}</span>
							</button>
						</div>

						{/* Quick Presets */}
						<div className="cf:flex cf:flex-col cf:gap-1.5">
							<div className="cf:grid cf:grid-cols-4 cf:gap-1.5 cf:font-mono">
								{WORKDAY_PRESETS.map(preset => {
									const isSelected = props.value === preset;
									return (
										<button
											key={preset}
											type="button"
											onClick={() => {
												props.onChange(preset);
												setDraft(null);
											}}
											className={cn(
												'cf:cursor-pointer cf:rounded-lg cf:px-2 cf:py-1.5 cf:text-center cf:text-xs cf:font-semibold cf:transition-colors',
												isSelected
													? 'cf:border cf:border-blue/40 cf:bg-blue-soft cf:text-blue-ink'
													: 'cf:border cf:border-transparent cf:bg-sunken cf:text-muted cf:hover:bg-line-strong cf:hover:text-ink',
											)}
										>
											{preset}
										</button>
									);
								})}
							</div>
						</div>

						{/* Hours & Minutes Columns */}
						<div className="cf:grid cf:grid-cols-2 cf:gap-3 cf:border-t cf:border-line cf:pt-2">
							{/* Hours (00-23) */}
							<div className="cf:flex cf:flex-col cf:gap-1.5">
								<div className="cf:text-[11px] cf:font-bold cf:text-muted cf:text-center">HH (00–23)</div>
								<div className="cf:flex cf:h-36 cf:flex-col cf:gap-0.5 cf:overflow-y-auto cf:rounded-xl cf:border cf:border-line cf:bg-canvas cf:p-1 cf:font-mono">
									{Array.from({ length: 24 }, (_, i) => {
										const val = String(i).padStart(2, '0');
										const isSelected = currentHour === val;
										return (
											<button
												key={val}
												type="button"
												onClick={() => setHour(val)}
												className={cn(
													'cf:m-0 cf:w-full cf:cursor-pointer cf:appearance-none cf:rounded-lg cf:border-0 cf:px-0 cf:py-1.5 cf:text-center cf:text-xs cf:transition-colors',
													isSelected
														? 'cf:bg-blue cf:font-bold cf:text-on-brand'
														: 'cf:bg-transparent cf:text-muted cf:hover:bg-sunken cf:hover:text-ink',
												)}
											>
												{val}
											</button>
										);
									})}
								</div>
							</div>

							{/* Minutes (00-55 step 5) */}
							<div className="cf:flex cf:flex-col cf:gap-1.5">
								<div className="cf:text-[11px] cf:font-bold cf:text-muted cf:text-center">MM (00–55)</div>
								<div className="cf:flex cf:h-36 cf:flex-col cf:gap-0.5 cf:overflow-y-auto cf:rounded-xl cf:border cf:border-line cf:bg-canvas cf:p-1 cf:font-mono">
									{Array.from({ length: 12 }, (_, i) => {
										const val = String(i * 5).padStart(2, '0');
										const isSelected = currentMinute === val;
										return (
											<button
												key={val}
												type="button"
												onClick={() => setMinute(val)}
												className={cn(
													'cf:m-0 cf:w-full cf:cursor-pointer cf:appearance-none cf:rounded-lg cf:border-0 cf:px-0 cf:py-1.5 cf:text-center cf:text-xs cf:transition-colors',
													isSelected
														? 'cf:bg-blue cf:font-bold cf:text-on-brand'
														: 'cf:bg-transparent cf:text-muted cf:hover:bg-sunken cf:hover:text-ink',
												)}
											>
												{val}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						{/* Footer / Done */}
						<div className="cf:flex cf:items-center cf:justify-end cf:border-t cf:border-line cf:pt-2">
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="cf:m-0 cf:cursor-pointer cf:appearance-none cf:rounded-xl cf:border-0 cf:bg-blue cf:px-5 cf:py-1.5 cf:text-xs cf:font-bold cf:text-on-brand cf:shadow-md cf:shadow-blue/20 cf:transition-all cf:hover:brightness-110"
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
