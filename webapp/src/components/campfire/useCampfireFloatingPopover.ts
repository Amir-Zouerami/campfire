import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/**
 * FloatingPlacement controls how the popover is aligned to its trigger.
 */
type FloatingPlacement = 'bottom-start' | 'bottom-end';

/**
 * FloatingPopoverStyle contains viewport-fixed geometry for a portaled picker.
 */
type FloatingPopoverStyle = CSSProperties;

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
	readonly minHeight?: number;
};

/**
 * UseCampfireFloatingPopoverResult contains the portal target and fixed styles.
 */
type UseCampfireFloatingPopoverResult = {
	readonly portalHost: HTMLElement | null;
	readonly style: FloatingPopoverStyle;
};

const HIDDEN_STYLE: FloatingPopoverStyle = {
	left: -9999,
	maxHeight: 'calc(100vh - 24px)',
	position: 'fixed',
	top: -9999,
	visibility: 'hidden',
	zIndex: 2147483647,
};

/**
 * useCampfireFloatingPopover positions shared date/time pickers in the viewport.
 *
 * The picker is portaled to document.body so Campfire cards, panels, filters,
 * and scroll containers cannot clip, stretch, or recolor it. The hook then does
 * the same job a floating-positioning engine does: it measures the trigger,
 * flips above when needed, shifts horizontally into view, and caps height.
 */
export function useCampfireFloatingPopover(input: UseCampfireFloatingPopoverInput): UseCampfireFloatingPopoverResult {
	const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
	const [style, setStyle] = useState<FloatingPopoverStyle>(HIDDEN_STYLE);

	const gap = input.gap ?? 8;
	const minHeight = input.minHeight ?? 160;
	const placement = input.placement ?? 'bottom-end';
	const viewportPadding = input.viewportPadding ?? 12;

	useLayoutEffect(() => {
		if (!input.open) {
			setPortalHost(null);
			setStyle(HIDDEN_STYLE);
			return;
		}

		setPortalHost((input.triggerRef.current?.ownerDocument ?? document).body);
	}, [input.open, input.triggerRef]);

	useLayoutEffect(() => {
		if (!input.open || portalHost === null) {
			return;
		}

		let animationFrame = 0;

		/**
		 * schedulePosition avoids repeated synchronous layout work during scroll.
		 */
		function schedulePosition(): void {
			window.cancelAnimationFrame(animationFrame);
			animationFrame = window.requestAnimationFrame(updatePosition);
		}

		/**
		 * updatePosition anchors the portaled popover to the trigger and clamps it
		 * inside the visual viewport.
		 */
		function updatePosition(): void {
			const trigger = input.triggerRef.current;
			const popover = input.popoverRef.current;

			if (trigger === null || popover === null) {
				setStyle(HIDDEN_STYLE);
				return;
			}

			const triggerRect = trigger.getBoundingClientRect();
			const popoverRect = popover.getBoundingClientRect();
			const visualViewport = window.visualViewport;
			const viewportLeft = visualViewport?.offsetLeft ?? 0;
			const viewportTop = visualViewport?.offsetTop ?? 0;
			const viewportWidth = visualViewport?.width ?? window.innerWidth;
			const viewportHeight = visualViewport?.height ?? window.innerHeight;
			const leftEdge = viewportLeft + viewportPadding;
			const rightEdge = viewportLeft + viewportWidth - viewportPadding;
			const topEdge = viewportTop + viewportPadding;
			const bottomEdge = viewportTop + viewportHeight - viewportPadding;
			const popoverWidth = Math.max(1, Math.ceil(popoverRect.width));
			const popoverHeight = Math.max(1, Math.ceil(popoverRect.height));

			const preferredLeft = placement === 'bottom-start' ? triggerRect.left : triggerRect.right - popoverWidth;
			const left = clamp(preferredLeft, leftEdge, Math.max(leftEdge, rightEdge - popoverWidth));

			const availableBelow = bottomEdge - triggerRect.bottom - gap;
			const availableAbove = triggerRect.top - topEdge - gap;
			const shouldOpenAbove = availableBelow < Math.min(popoverHeight, minHeight) && availableAbove > availableBelow;
			const availableHeight = shouldOpenAbove ? availableAbove : availableBelow;
			const maxHeight = Math.max(minHeight, Math.floor(availableHeight));
			const renderedHeight = Math.min(popoverHeight, maxHeight);
			const preferredTop = shouldOpenAbove ? triggerRect.top - gap - renderedHeight : triggerRect.bottom + gap;
			const top = clamp(preferredTop, topEdge, Math.max(topEdge, bottomEdge - renderedHeight));

			setStyle({
				left: `${Math.round(left)}px`,
				maxHeight: `${maxHeight}px`,
				position: 'fixed',
				top: `${Math.round(top)}px`,
				visibility: 'visible',
				zIndex: 2147483647,
			});
		}

		schedulePosition();

		window.addEventListener('resize', schedulePosition);
		document.addEventListener('scroll', schedulePosition, true);
		window.visualViewport?.addEventListener('resize', schedulePosition);
		window.visualViewport?.addEventListener('scroll', schedulePosition);

		return () => {
			window.cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', schedulePosition);
			document.removeEventListener('scroll', schedulePosition, true);
			window.visualViewport?.removeEventListener('resize', schedulePosition);
			window.visualViewport?.removeEventListener('scroll', schedulePosition);
		};
	}, [gap, input.open, input.popoverRef, input.triggerRef, minHeight, placement, portalHost, viewportPadding]);

	return { portalHost, style };
}

/**
 * clamp constrains a number to an inclusive range.
 */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
