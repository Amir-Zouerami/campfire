import {
	Children,
	isValidElement,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
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
 * MenuRect stores the fixed dropdown geometry.
 */
type MenuRect = {
	readonly top: number;
	readonly left: number;
	readonly width: number;
	readonly maxHeight: number;
};

/**
 * CampfireSelect renders a Campfire-styled dropdown without portaling to document.body.
 */
export function CampfireSelect(props: CampfireSelectProps): ReactElement {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const [open, setOpen] = useState(false);
	const [menuRect, setMenuRect] = useState<MenuRect | null>(null);

	const options = useMemo(() => extractOptions(props.children), [props.children]);
	const selectedOption = options.find(option => option.value === props.value) ?? null;
	const menuID = `${props.id}-menu`;

	useEffect(() => {
		if (!open) {
			return;
		}

		/**
		 * handlePointerDown closes the menu when the user clicks outside the control.
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
		 * handleGeometryChange keeps the fixed menu attached while the modal scrolls/resizes.
		 */
		function handleGeometryChange(): void {
			updateMenuRect();
		}

		document.addEventListener('mousedown', handlePointerDown, true);
		window.addEventListener('resize', handleGeometryChange);
		window.addEventListener('scroll', handleGeometryChange, true);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown, true);
			window.removeEventListener('resize', handleGeometryChange);
			window.removeEventListener('scroll', handleGeometryChange, true);
		};
	}, [open]);

	/**
	 * updateMenuRect updates dropdown placement from the trigger button.
	 */
	function updateMenuRect(): void {
		const button = buttonRef.current;

		if (button === null) {
			setMenuRect(null);
			return;
		}

		const rect = button.getBoundingClientRect();

		setMenuRect({
			top: rect.bottom + 6,
			left: rect.left,
			width: rect.width,
			maxHeight: Math.max(180, window.innerHeight - rect.bottom - 18),
		});
	}

	/**
	 * toggleOpen toggles the menu and calculates geometry first.
	 */
	function toggleOpen(): void {
		if (props.disabled === true) {
			return;
		}

		updateMenuRect();
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
				updateMenuRect();
				setOpen(true);
				moveSelection(1);
				break;

			case 'ArrowUp':
				event.preventDefault();
				updateMenuRect();
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
		<div ref={rootRef} className="cf:relative">
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? menuID : undefined}
				disabled={props.disabled}
				className={cn(
					'cf:flex cf:h-11 cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/25 cf:px-3 cf:py-2 cf:text-left cf:text-base cf:font-semibold cf:text-foreground cf:outline-none cf:transition',
					'hover:cf:border-amber-300/30 hover:cf:bg-black/35',
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

			{open && menuRect !== null && (
				<div
					id={menuID}
					role="listbox"
					aria-labelledby={props.id}
					className="cf:fixed cf:z-[2147483647] cf:overflow-auto cf:rounded-xl cf:border cf:border-amber-200/20 cf:bg-[#12100d] cf:p-1.5 cf:shadow-2xl cf:shadow-black/70 cf:ring-1 cf:ring-white/10"
					style={menuStyle(menuRect)}
				>
					{options.length === 0 ? (
						<div className="cf:px-3 cf:py-2 cf:text-sm cf:font-semibold cf:text-muted-foreground">
							No options
						</div>
					) : (
						options.map(option => {
							const selected = option.value === props.value;

							return (
								<button
									key={option.value}
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
 * menuStyle returns fixed dropdown placement.
 */
function menuStyle(rect: MenuRect): CSSProperties {
	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		maxHeight: rect.maxHeight,
	};
}

/**
 * extractOptions converts option children into renderable menu options.
 */
function extractOptions(children: ReactNode): readonly CampfireSelectOption[] {
	return Children.toArray(children)
		.map((child, index) => optionFromChild(child, index))
		.filter((option): option is CampfireSelectOption => option !== null);
}

/**
 * optionFromChild converts a single option element into a Campfire option.
 */
function optionFromChild(child: ReactNode, _index: number): CampfireSelectOption | null {
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
