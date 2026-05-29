import type { CSSProperties, RefObject } from 'react';

/**
 * FloatingPlacement controls how the popover is aligned to its trigger.
 */
type FloatingPlacement = 'bottom-start' | 'bottom-end';

/**
 * UseCampfireFloatingPopoverInput contains refs for one custom Campfire picker.
 */
type UseCampfireFloatingPopoverInput = {
	readonly open: boolean;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly popoverRef: RefObject<HTMLElement | null>;
	readonly placement?: FloatingPlacement;
	readonly gap?: number;
	readonly viewportPadding?: number;
};

/**
 * useCampfireFloatingPopover returns local anchored popover styles.
 *
 * The previous fixed-position implementation tried to clamp against the whole
 * browser viewport. Inside the Mattermost plugin modal that made custom date
 * and time pickers appear far away from the input and allowed wide triggers to
 * stretch the calendar. Campfire pickers should stay visually attached to the
 * field that opened them; CSS handles the fixed picker width and z-index.
 */
export function useCampfireFloatingPopover(input: UseCampfireFloatingPopoverInput): CSSProperties {
	if (!input.open) {
		return {};
	}

	const gap = input.gap ?? 8;
	const inlineAnchor = input.placement === 'bottom-start' ? { left: 0 } : { right: 0 };

	return {
		...inlineAnchor,
		position: 'absolute',
		top: `calc(100% + ${gap}px)`,
	};
}
