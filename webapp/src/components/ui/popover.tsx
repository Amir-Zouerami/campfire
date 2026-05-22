'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Popover renders the shadcn popover root.
 */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

/**
 * PopoverTrigger renders the popover trigger.
 */
function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * PopoverContent renders popover content inside the plugin tree.
 */
function PopoverContent({
	className,
	align = 'center',
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Content
			data-slot="popover-content"
			align={align}
			sideOffset={sideOffset}
			className={cn(
				[
					'cf:z-[10050]',
					'cf:flex',
					'cf:w-80',
					'cf:origin-[var(--radix-popover-content-transform-origin)]',
					'cf:flex-col',
					'cf:gap-4',
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

/**
 * PopoverAnchor renders a popover anchor.
 */
function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
	return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/**
 * PopoverHeader renders popover header copy.
 */
function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="popover-header"
			className={cn('cf:flex cf:flex-col cf:gap-1 cf:text-base', className)}
			{...props}
		/>
	);
}

/**
 * PopoverTitle renders popover title text.
 */
function PopoverTitle({ className, ...props }: React.ComponentProps<'h2'>) {
	return (
		<h2
			data-slot="popover-title"
			className={cn('cf:text-lg cf:font-black cf:leading-tight cf:text-foreground', className)}
			{...props}
		/>
	);
}

/**
 * PopoverDescription renders popover description text.
 */
function PopoverDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			data-slot="popover-description"
			className={cn('cf:text-base cf:font-medium cf:leading-7 cf:text-muted-foreground', className)}
			{...props}
		/>
	);
}

export { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
