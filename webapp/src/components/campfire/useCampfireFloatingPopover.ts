import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/**
 * FloatingPlacement controls how the popover is aligned to its trigger.
 */
type FloatingPlacement = 'bottom-start' | 'bottom-end';

/**
 * FloatingSide describes whether the popover opens below or above the trigger.
 */
type FloatingSide = 'below' | 'above';

/**
 * FloatingPopoverStyle contains normal CSS plus custom properties consumed by
 * the late Campfire picker CSS. Custom properties let the cascade keep
 * `!important` z-index/position repairs while this hook decides placement.
 */
type FloatingPopoverStyle = CSSProperties & {
	readonly '--campfire-floating-top'?: string;
	readonly '--campfire-floating-bottom'?: string;
	readonly '--campfire-floating-left'?: string;
	readonly '--campfire-floating-right'?: string;
};

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
 * Campfire custom pickers live inside a scrollable Mattermost modal. A simple
 * always-open-down absolute popover can be clipped by the lower modal boundary,
 * while a body-level portal would escape Campfire theme variables. This hook
 * keeps the popover inside the local React tree and flips it above its trigger
 * only when the available space below is smaller than the rendered picker.
 */
export function useCampfireFloatingPopover(input: UseCampfireFloatingPopoverInput): FloatingPopoverStyle {
	const [side, setSide] = useState<FloatingSide>('below');

	const gap = input.gap ?? 8;
	const viewportPadding = input.viewportPadding ?? 24;
	const placement = input.placement ?? 'bottom-end';

	useLayoutEffect(() => {
		if (!input.open) {
			setSide('below');
			return;
		}

		/**
		 * updateSide chooses the opening direction from live rendered geometry.
		 */
		function updateSide(): void {
			const trigger = input.triggerRef.current;
			const popover = input.popoverRef.current;

			if (trigger === null || popover === null) {
				return;
			}

			const triggerRect = trigger.getBoundingClientRect();
			const popoverRect = popover.getBoundingClientRect();
			const visualViewport = window.visualViewport;
			const viewportTop = visualViewport?.offsetTop ?? 0;
			const viewportHeight = visualViewport?.height ?? window.innerHeight;
			const lowerEdge = viewportTop + viewportHeight - viewportPadding;
			const upperEdge = viewportTop + viewportPadding;
			const popoverHeight = popoverRect.height;
			const availableBelow = lowerEdge - triggerRect.bottom - gap;
			const availableAbove = triggerRect.top - upperEdge - gap;
			const shouldOpenAbove = availableBelow < popoverHeight && availableAbove > availableBelow;

			setSide(shouldOpenAbove ? 'above' : 'below');
		}

		updateSide();
		const animationFrameID = window.requestAnimationFrame(updateSide);

		window.addEventListener('resize', updateSide);
		window.addEventListener('scroll', updateSide, true);
		window.visualViewport?.addEventListener('resize', updateSide);
		window.visualViewport?.addEventListener('scroll', updateSide);

		return () => {
			window.cancelAnimationFrame(animationFrameID);
			window.removeEventListener('resize', updateSide);
			window.removeEventListener('scroll', updateSide, true);
			window.visualViewport?.removeEventListener('resize', updateSide);
			window.visualViewport?.removeEventListener('scroll', updateSide);
		};
	}, [gap, input.open, input.popoverRef, input.triggerRef, viewportPadding]);

	if (!input.open) {
		return {};
	}

	return {
		'--campfire-floating-bottom': side === 'above' ? `calc(100% + ${gap}px)` : 'auto',
		'--campfire-floating-left': placement === 'bottom-start' ? '0' : 'auto',
		'--campfire-floating-right': placement === 'bottom-start' ? 'auto' : '0',
		'--campfire-floating-top': side === 'below' ? `calc(100% + ${gap}px)` : 'auto',
		position: 'absolute',
	};
}
