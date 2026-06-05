import {
	Children,
	isValidElement,
	useDeferredValue,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
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
	readonly searchable?: boolean;
	readonly searchPlaceholder?: string;
	readonly maxVisibleOptions?: number;
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

type SelectMenuPlacement = {
	readonly top: number;
	readonly left: number;
	readonly width: number;
	readonly maxHeight: number;
};

const SELECT_MENU_GAP = 8;
const SELECT_VIEWPORT_PADDING = 14;
const SELECT_MIN_MENU_HEIGHT = 124;
const SELECT_DEFAULT_MENU_HEIGHT = 320;
const SELECT_MIN_MENU_WIDTH = 180;

/**
 * CampfireSelect renders the shared Campfire dropdown.
 *
 * The menu is portaled to the active Campfire overlay, not to the local card and
 * not to an opaque full-screen layer. That keeps the menu above question cards
 * without clipping the rest of the modal or breaking the application styles.
 */
export function CampfireSelect(props: CampfireSelectProps): ReactElement {
	const rootRef = useRef<HTMLDivElement | null>(null);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const searchRef = useRef<HTMLInputElement | null>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [menuPlacement, setMenuPlacement] = useState<SelectMenuPlacement | null>(null);
	const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
	const deferredQuery = useDeferredValue(query);

	const options = useMemo(() => extractOptions(props.children), [props.children]);
	const selectedOption = options.find(option => option.value === props.value) ?? null;
	const filteredOptions = useMemo(
		() => filterOptions(options, deferredQuery, props.searchable === true),
		[deferredQuery, options, props.searchable],
	);
	const visibleOptions = props.maxVisibleOptions === undefined ? filteredOptions : filteredOptions.slice(0, props.maxVisibleOptions);
	const hiddenOptionCount = Math.max(0, filteredOptions.length - visibleOptions.length);
	const menuID = `${props.id}-menu`;

	useLayoutEffect(() => {
		if (!open) {
			setMenuPlacement(null);
			setPortalHost(null);
			return;
		}

		setPortalHost(findPortalHost(buttonRef.current));

		let animationFrame = window.requestAnimationFrame(updateMenuPlacement);

		function handleWindowUpdate(): void {
			window.cancelAnimationFrame(animationFrame);
			animationFrame = window.requestAnimationFrame(updateMenuPlacement);
		}

		window.addEventListener('resize', handleWindowUpdate);
		document.addEventListener('scroll', handleWindowUpdate, true);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', handleWindowUpdate);
			document.removeEventListener('scroll', handleWindowUpdate, true);
		};
	}, [open, visibleOptions.length]);

	useLayoutEffect(() => {
		if (!open || portalHost === null) {
			return;
		}

		const animationFrame = window.requestAnimationFrame(updateMenuPlacement);

		return () => window.cancelAnimationFrame(animationFrame);
	}, [open, portalHost, deferredQuery, visibleOptions.length]);

	useEffect(() => {
		if (!open) {
			setQuery('');
			return;
		}

		if (props.searchable === true) {
			window.setTimeout(() => searchRef.current?.focus(), 0);
		}

		function handlePointerDown(event: MouseEvent): void {
			if (!(event.target instanceof Node)) {
				return;
			}

			if (rootRef.current !== null && rootRef.current.contains(event.target)) {
				return;
			}

			if (menuRef.current !== null && menuRef.current.contains(event.target)) {
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
	}, [open, props.searchable]);

	/**
	 * updateMenuPlacement measures the trigger and positions the menu inside the
	 * viewport. Width is locked to the trigger width and not narrowed by page CSS.
	 */
	function updateMenuPlacement(): void {
		const trigger = buttonRef.current;
		if (trigger === null || typeof window === 'undefined') {
			return;
		}

		const triggerRect = trigger.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const width = Math.max(SELECT_MIN_MENU_WIDTH, Math.round(triggerRect.width));
		const left = clamp(
			Math.round(triggerRect.left),
			SELECT_VIEWPORT_PADDING,
			Math.max(SELECT_VIEWPORT_PADDING, viewportWidth - width - SELECT_VIEWPORT_PADDING),
		);

		const renderedHeight = menuRef.current?.offsetHeight ?? SELECT_DEFAULT_MENU_HEIGHT;
		const desiredHeight = Math.max(SELECT_MIN_MENU_HEIGHT, Math.min(renderedHeight, SELECT_DEFAULT_MENU_HEIGHT));
		const spaceBelow = viewportHeight - triggerRect.bottom - SELECT_MENU_GAP - SELECT_VIEWPORT_PADDING;
		const spaceAbove = triggerRect.top - SELECT_MENU_GAP - SELECT_VIEWPORT_PADDING;
		const openAbove = spaceBelow < Math.min(desiredHeight, SELECT_MIN_MENU_HEIGHT) && spaceAbove > spaceBelow;
		const availableHeight = Math.max(SELECT_MIN_MENU_HEIGHT, openAbove ? spaceAbove : spaceBelow);
		const maxHeight = Math.max(SELECT_MIN_MENU_HEIGHT, Math.min(desiredHeight, availableHeight));
		const top = openAbove
			? Math.max(SELECT_VIEWPORT_PADDING, triggerRect.top - SELECT_MENU_GAP - maxHeight)
			: Math.min(triggerRect.bottom + SELECT_MENU_GAP, viewportHeight - SELECT_VIEWPORT_PADDING - maxHeight);

		setMenuPlacement({ top, left, width, maxHeight });
	}

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
		<div ref={rootRef} className={cn('campfire-select-root cf:relative cf:w-full', open && 'campfire-select-root--open', props.className)}>
			<button
				ref={buttonRef}
				id={props.id}
				type="button"
				disabled={props.disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={menuID}
				className={cn(
					'campfire-select-trigger cf:flex cf:h-11 cf:w-full cf:items-center cf:justify-between cf:gap-3 cf:rounded-xl cf:border cf:px-3.5',
					'cf:text-left cf:text-base cf:font-medium cf:text-foreground cf:shadow-none cf:outline-none',
					'cf:transition-[background-color,border-color,box-shadow,transform]',
					'disabled:cf:cursor-not-allowed disabled:cf:opacity-50',
					open && 'campfire-select-trigger--open',
				)}
				onClick={toggleOpen}
				onKeyDown={handleButtonKeyDown}
			>
				<CampfireBidiText className="campfire-select-trigger-label cf:min-w-0 cf:truncate">
					{selectedOption?.label ?? 'Choose option'}
				</CampfireBidiText>
				<ChevronDown
					className={cn(
						'campfire-select-chevron cf:size-4 cf:flex-none cf:transition-transform',
						open && 'cf:rotate-180',
					)}
					aria-hidden="true"
				/>
			</button>

			{open && portalHost !== null && createPortal(
				<div
					ref={menuRef}
					id={menuID}
					role="listbox"
					aria-labelledby={props.id}
					className="campfire-select-menu"
					style={placementToStyle(menuPlacement)}
				>
					{props.searchable === true && (
						<label className="campfire-select-search">
							<Search className="cf:size-4" aria-hidden="true" />
							<input
								ref={searchRef}
								type="search"
								placeholder={props.searchPlaceholder ?? 'Search…'}
								value={query}
								onChange={event => setQuery(event.currentTarget.value)}
								onKeyDown={event => event.stopPropagation()}
							dir="auto"
							/>
						</label>
					)}

					<div className="campfire-select-options">
						{visibleOptions.map(option => {
							const selected = option.value === props.value;

							return (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={selected}
									disabled={option.disabled}
									className={cn(
										'campfire-select-option',
										selected && 'campfire-select-option--selected',
										option.disabled && 'campfire-select-option--disabled',
									)}
									onClick={() => selectOption(option)}
								>
									<CampfireBidiText className="campfire-select-option-label cf:min-w-0 cf:truncate">
										{option.content}
									</CampfireBidiText>
									{selected && !option.disabled && (
										<Check className="campfire-select-check cf:size-4 cf:flex-none" aria-hidden="true" />
									)}
								</button>
							);
						})}
					</div>

					{hiddenOptionCount > 0 && (
						<p className="campfire-select-hidden-count">
							Showing {visibleOptions.length} of {filteredOptions.length}. Search to narrow the list.
						</p>
					)}
				</div>,
				portalHost,
			)}
		</div>
	);
}

/**
 * placementToStyle maps measured placement to fixed menu CSS.
 */
function placementToStyle(placement: SelectMenuPlacement | null): CSSProperties {
	if (placement === null) {
		return {
			position: 'fixed',
			top: -9999,
			left: -9999,
			width: 240,
			minWidth: 240,
			maxWidth: 240,
			maxHeight: SELECT_DEFAULT_MENU_HEIGHT,
			visibility: 'hidden',
			'--campfire-select-menu-width': '240px',
		} as CSSProperties;
	}

	return {
		position: 'fixed',
		top: placement.top,
		left: placement.left,
		width: placement.width,
		minWidth: placement.width,
		maxWidth: placement.width,
		maxHeight: placement.maxHeight,
		'--campfire-select-menu-width': `${placement.width}px`,
	} as CSSProperties;
}

/**
 * findPortalHost returns the active Campfire overlay so the menu stays within
 * the dialog style scope but outside overflow-hidden cards.
 */
function findPortalHost(trigger: HTMLElement | null): HTMLElement {
	const host = trigger?.closest('.campfire-overlay');
	if (host instanceof HTMLElement) {
		return host;
	}

	return document.body;
}

/**
 * clamp keeps a number inside a safe range.
 */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * filterOptions applies local text search when enabled.
 */
function filterOptions(
	options: readonly CampfireSelectOption[],
	query: string,
	searchable: boolean,
): readonly CampfireSelectOption[] {
	if (!searchable) {
		return options;
	}

	const cleanQuery = query.trim().toLowerCase();
	if (cleanQuery === '') {
		return options;
	}

	return options.filter(option => option.label.toLowerCase().includes(cleanQuery) || option.value.toLowerCase().includes(cleanQuery));
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

		const label = textFromNode(childProps.children) || childProps.value;

		options.push({
			value: childProps.value,
			label,
			content: childProps.children ?? childProps.value,
			disabled: childProps.disabled === true || childProps.value.trim() === '',
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
