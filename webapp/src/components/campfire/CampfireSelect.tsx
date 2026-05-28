import {
	Children,
	isValidElement,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * CampfireSelectProps contains a styled select-compatible control.
 */
type CampfireSelectProps = {
	readonly id: string;
	readonly value: string;
	readonly disabled?: boolean;
	readonly className?: string;
	readonly children: ReactNode;
	readonly onValueChange: (value: string) => void;
};

/**
 * CampfireSelectOption stores one option extracted from option children.
 */
type CampfireSelectOption = {
	readonly value: string;
	readonly label: string;
	readonly content: ReactNode;
	readonly disabled: boolean;
};

/**
 * CampfireSelect renders a Mattermost-safe dropdown anchored directly to its trigger.
 */
export function CampfireSelect(props: CampfireSelectProps): ReactElement {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [open, setOpen] = useState(false);

	const options = useMemo(() => extractOptions(props.children), [props.children]);
	const selectedOption = options.find(option => option.value === props.value) ?? null;
	const menuID = `${props.id}-menu`;

	useEffect(() => {
		if (!open) {
			return;
		}

		function handlePointerDown(event: MouseEvent): void {
			if (!(event.target instanceof Node)) {
				return;
			}

			if (rootRef.current !== null && rootRef.current.contains(event.target)) {
				return;
			}

			setOpen(false);
		}

		function handleEscape(event: globalThis.KeyboardEvent): void {
			if (event.key === 'Escape') {
				setOpen(false);
				buttonRef.current?.focus();
			}
		}

		document.addEventListener('mousedown', handlePointerDown, true);
		document.addEventListener('keydown', handleEscape, true);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown, true);
			document.removeEventListener('keydown', handleEscape, true);
		};
	}, [open]);

	function toggleOpen(): void {
		if (props.disabled === true) {
			return;
		}

		setOpen(current => !current);
	}

	function selectOption(option: CampfireSelectOption): void {
		if (option.disabled) {
			return;
		}

		props.onValueChange(option.value);
		setOpen(false);
		buttonRef.current?.focus();
	}

	function selectRelativeOption(direction: 1 | -1): void {
		const enabledOptions = options.filter(option => !option.disabled);
		if (enabledOptions.length === 0) {
			return;
		}

		const currentIndex = enabledOptions.findIndex(option => option.value === props.value);
		const nextIndex =
			currentIndex === -1
				? direction === 1
					? 0
					: enabledOptions.length - 1
				: (currentIndex + direction + enabledOptions.length) % enabledOptions.length;

		const nextOption = enabledOptions[nextIndex];
		if (nextOption === undefined) {
			return;
		}

		props.onValueChange(nextOption.value);
	}

	function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setOpen(true);
				selectRelativeOption(1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				setOpen(true);
				selectRelativeOption(-1);
				break;

			case 'Enter':
			case ' ':
				event.preventDefault();
				toggleOpen();
				break;

			case 'Escape':
				event.preventDefault();
				setOpen(false);
				break;
		}
	}

	return (
		<div ref={rootRef} className={cn('cf:relative cf:w-full', open ? 'cf:z-9999' : 'cf:z-0', props.className)}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				disabled={props.disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={menuID}
				className={cn(
					'cf:flex cf:h-10 cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-xl cf:border cf:px-3',
					'cf:bg-black/55 cf:text-left cf:text-sm cf:font-bold cf:text-foreground cf:shadow-inner cf:outline-none',
					'cf:border-amber-300/20 cf:transition-[background-color,border-color,box-shadow,transform]',
					'hover:cf:border-amber-300/70 hover:cf:bg-amber-950/35 hover:cf:shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_22px_rgba(245,158,11,0.10)]',
					'focus-visible:cf:border-amber-300/80 focus-visible:cf:ring-2 focus-visible:cf:ring-amber-300/25',
					'disabled:cf:cursor-not-allowed disabled:cf:opacity-50',
					open && 'cf:border-amber-300/80 cf:bg-amber-950/35 cf:ring-2 cf:ring-amber-300/20',
				)}
				onClick={toggleOpen}
				onKeyDown={handleButtonKeyDown}
			>
				<span className="cf:min-w-0 cf:truncate">{selectedOption?.label ?? 'Choose option'}</span>
				<ChevronDown
					className={cn(
						'cf:size-4 cf:flex-none cf:text-amber-200 cf:transition-transform',
						open && 'cf:rotate-180',
					)}
					aria-hidden="true"
				/>
			</button>

			{open && (
				<div
					id={menuID}
					role="listbox"
					aria-labelledby={props.id}
					className={cn(
						'cf:absolute cf:left-0 cf:right-0 cf:top-[calc(100%+0.35rem)] cf:z-10000',
						'cf:max-h-72 cf:overflow-y-auto cf:rounded-xl cf:border cf:border-amber-300/30',
						'cf:bg-[#050505] cf:p-1.5 cf:shadow-[0_24px_80px_rgba(0,0,0,0.80)] cf:ring-1 cf:ring-white/10',
					)}
				>
					{options.map(option => {
						const selected = option.value === props.value;

						return (
							<button
								key={option.value}
								type="button"
								role="option"
								aria-selected={selected}
								disabled={option.disabled}
								className={cn(
									'cf:flex cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-lg cf:px-3 cf:py-2.5',
									'cf:text-left cf:text-sm cf:font-bold cf:text-slate-200 cf:outline-none',
									'cf:transition-[background-color,color,box-shadow,transform]',
									'hover:cf:bg-amber-300/18 hover:cf:text-amber-50 hover:cf:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]',
									'focus:cf:bg-amber-300/18 focus:cf:text-amber-50 focus:cf:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]',
									selected && 'cf:bg-amber-300/22 cf:text-amber-50',
									option.disabled && 'cf:pointer-events-none cf:opacity-45',
								)}
								onClick={() => selectOption(option)}
							>
								<span className="cf:min-w-0 cf:truncate">{option.content}</span>
								{selected && (
									<Check className="cf:size-4 cf:flex-none cf:text-amber-200" aria-hidden="true" />
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

/**
 * extractOptions converts option children into CampfireSelectOption rows.
 */
function extractOptions(children: ReactNode): readonly CampfireSelectOption[] {
	const options: CampfireSelectOption[] = [];

	Children.forEach(children, child => {
		if (!isValidElement(child)) {
			return;
		}

		const childProps = child.props as {
			readonly value?: unknown;
			readonly disabled?: unknown;
			readonly children?: ReactNode;
		};

		if (typeof childProps.value !== 'string') {
			return;
		}

		options.push({
			value: childProps.value,
			label: textFromNode(childProps.children) || childProps.value,
			content: childProps.children ?? childProps.value,
			disabled: childProps.disabled === true,
		});
	});

	return options;
}

/**
 * textFromNode extracts readable text from option children.
 */
function textFromNode(node: ReactNode): string {
	if (typeof node === 'string' || typeof node === 'number') {
		return String(node);
	}

	if (Array.isArray(node)) {
		return node.map(textFromNode).join('').trim();
	}

	return '';
}
