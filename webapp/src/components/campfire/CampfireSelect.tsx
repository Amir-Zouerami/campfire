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
 * CampfireSelect renders a Mattermost-safe dropdown anchored to its own field.
 *
 * The menu is absolute inside this component instead of fixed-positioned or
 * portaled. Fixed menus drift inside Mattermost's modal scroll container.
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

		/**
		 * handlePointerDown closes the menu when clicking outside this select.
		 */
		function handlePointerDown(event: MouseEvent): void {
			if (!(event.target instanceof Node)) {
				return;
			}

			if (rootRef.current !== null && rootRef.current.contains(event.target)) {
				return;
			}

			setOpen(false);
		}

		/**
		 * handleEscape closes the menu with Escape.
		 */
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

	/**
	 * toggleOpen toggles the menu.
	 */
	function toggleOpen(): void {
		if (props.disabled === true) {
			return;
		}

		setOpen(current => !current);
	}

	/**
	 * selectOption commits an option selection.
	 */
	function selectOption(option: CampfireSelectOption): void {
		if (option.disabled) {
			return;
		}

		props.onValueChange(option.value);
		setOpen(false);
		buttonRef.current?.focus();
	}

	/**
	 * moveSelection moves selection with keyboard arrows.
	 */
	function moveSelection(direction: 1 | -1): void {
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

		props.onValueChange(enabledOptions[nextIndex]?.value ?? props.value);
	}

	/**
	 * handleButtonKeyDown handles select keyboard behavior.
	 */
	function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setOpen(true);
				moveSelection(1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				setOpen(true);
				moveSelection(-1);
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
		<div ref={rootRef} className={cn('cf:relative', open && 'cf:z-120')}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? menuID : undefined}
				disabled={props.disabled}
				className={cn(
					'cf:flex cf:h-11 cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/30 cf:px-3 cf:py-2 cf:text-left cf:text-base cf:font-semibold cf:text-foreground cf:outline-none cf:transition',
					'cf:shadow-inner cf:shadow-black/20',
					'hover:cf:border-amber-300/30 hover:cf:bg-black/40',
					'focus-visible:cf:border-amber-300/45 focus-visible:cf:ring-2 focus-visible:cf:ring-amber-300/20',
					'disabled:cf:cursor-not-allowed disabled:cf:opacity-60',
					props.className,
				)}
				onClick={toggleOpen}
				onKeyDown={handleButtonKeyDown}
			>
				<span className="cf:min-w-0 cf:truncate">
					{selectedOption === null ? 'Choose…' : selectedOption.content}
				</span>

				<ChevronDown
					className={cn('cf:size-4 cf:shrink-0 cf:text-amber-100/80 cf:transition', open && 'cf:rotate-180')}
				/>
			</button>

			{open && (
				<div
					id={menuID}
					role="listbox"
					aria-labelledby={props.id}
					className="cf:absolute cf:left-0 cf:right-0 cf:top-[calc(100%+0.4rem)] cf:z-121 cf:max-h-64 cf:overflow-auto cf:rounded-xl cf:border cf:border-amber-200/20 cf:bg-[#12100d] cf:p-1.5 cf:shadow-2xl cf:shadow-black/70 cf:ring-1 cf:ring-white/10"
				>
					{options.length === 0 ? (
						<div className="cf:px-3 cf:py-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
							No options
						</div>
					) : (
						options.map((option, index) => {
							const selected = option.value === props.value;

							return (
								<button
									key={`${option.value}-${index}`}
									type="button"
									role="option"
									aria-selected={selected}
									disabled={option.disabled}
									className={cn(
										'cf:flex cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-lg cf:px-3 cf:py-2.5 cf:text-left cf:text-sm cf:font-bold cf:text-slate-100 cf:outline-none cf:transition',
										'hover:cf:bg-amber-300/10 focus-visible:cf:bg-amber-300/10',
										selected && 'cf:bg-amber-300/15 cf:text-amber-50',
										option.disabled && 'cf:cursor-not-allowed cf:opacity-50',
									)}
									onClick={() => selectOption(option)}
								>
									<span className="cf:min-w-0 cf:truncate">{option.content}</span>
									{selected && <Check className="cf:size-4 cf:shrink-0 cf:text-amber-200" />}
								</button>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

/**
 * extractOptions converts option children into renderable menu options.
 */
function extractOptions(children: ReactNode): readonly CampfireSelectOption[] {
	return Children.toArray(children)
		.map(optionFromChild)
		.filter((option): option is CampfireSelectOption => option !== null);
}

/**
 * optionFromChild converts a single option element into a Campfire option.
 */
function optionFromChild(child: ReactNode): CampfireSelectOption | null {
	if (!isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') {
		return null;
	}

	const label = textFromReactNode(child.props.children).trim();
	const value = child.props.value === undefined ? label : String(child.props.value);

	return {
		value,
		label,
		content: child.props.children ?? label,
		disabled: child.props.disabled === true,
	};
}

/**
 * textFromReactNode extracts readable text from React option content.
 */
function textFromReactNode(node: ReactNode): string {
	if (typeof node === 'string' || typeof node === 'number') {
		return String(node);
	}

	if (Array.isArray(node)) {
		return node.map(textFromReactNode).join('');
	}

	return '';
}
