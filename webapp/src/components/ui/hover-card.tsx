'use client';

import * as React from 'react';
import { HoverCard as HoverCardPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * HoverCard renders the shadcn hover-card root.
 */
function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
	return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

/**
 * HoverCardTrigger renders the hover-card trigger.
 */
function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
	return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

/**
 * HoverCardContent renders hover-card content inside the plugin tree.
 */
function HoverCardContent({
	className,
	align = 'center',
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
	return (
		<HoverCardPrimitive.Content
			data-slot="hover-card-content"
			align={align}
			sideOffset={sideOffset}
			className={cn(
				[
					'cf:z-[10050]',
					'cf:w-80',
					'cf:origin-[var(--radix-hover-card-content-transform-origin)]',
					'cf:rounded-3xl',
					'cf:border',
					'cf:border-border',
					'cf:bg-popover',
					'cf:p-4',
					'cf:text-base',
					'cf:text-popover-foreground',
					'cf:shadow-[0_28px_70px_rgba(0,0,0,0.5)]',
					'cf:ring-1',
					'cf:ring-foreground/5',
					'cf:outline-hidden',
					'cf:duration-100',
					'cf:data-[side=bottom]:slide-in-from-top-2',
					'cf:data-[side=left]:slide-in-from-right-2',
					'cf:data-[side=right]:slide-in-from-left-2',
					'cf:data-[side=top]:slide-in-from-bottom-2',
					'cf:dark:ring-foreground/10',
					'cf:data-open:animate-in',
					'cf:data-open:fade-in-0',
					'cf:data-open:zoom-in-95',
					'cf:data-closed:animate-out',
					'cf:data-closed:fade-out-0',
					'cf:data-closed:zoom-out-95',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
