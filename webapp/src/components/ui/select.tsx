'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

/**
 * Select renders the shadcn select root.
 */
function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/**
 * SelectGroup renders grouped select items.
 */
function SelectGroup({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return (
		<SelectPrimitive.Group
			data-slot="select-group"
			className={cn('cf:scroll-my-1.5 cf:p-1.5', className)}
			{...props}
		/>
	);
}

/**
 * SelectValue renders the selected value.
 */
function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/**
 * SelectTrigger renders the select trigger with Campfire-prefixed classes.
 */
function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
	size?: 'sm' | 'default';
}) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				[
					'cf:flex',
					'cf:w-full',
					'cf:cursor-pointer',
					'cf:items-center',
					'cf:justify-between',
					'cf:gap-2',
					'cf:rounded-2xl',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/75',
					'cf:px-4',
					'cf:py-2',
					'cf:text-base',
					'cf:font-semibold',
					'cf:text-foreground',
					'cf:whitespace-nowrap',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
					'cf:outline-none',
					'cf:transition-[color,box-shadow,background-color,border-color]',
					'cf:hover:border-white/20',
					'cf:hover:bg-background/90',
					'cf:focus-visible:border-ring',
					'cf:focus-visible:ring-3',
					'cf:focus-visible:ring-ring/30',
					'cf:disabled:cursor-not-allowed',
					'cf:disabled:opacity-50',
					'cf:aria-invalid:border-destructive',
					'cf:aria-invalid:ring-3',
					'cf:aria-invalid:ring-destructive/20',
					'cf:data-placeholder:text-muted-foreground',
					'cf:data-[size=default]:h-12',
					'cf:data-[size=sm]:h-10',
					'cf:*:data-[slot=select-value]:flex',
					'cf:*:data-[slot=select-value]:min-w-0',
					'cf:*:data-[slot=select-value]:items-center',
					'cf:*:data-[slot=select-value]:gap-2',
					'cf:*:data-[slot=select-value]:truncate',
					'cf:dark:aria-invalid:border-destructive/50',
					'cf:dark:aria-invalid:ring-destructive/40',
					'cf:[&_svg]:pointer-events-none',
					'cf:[&_svg]:shrink-0',
					"cf:[&_svg:not([class*='size-'])]:size-5",
				].join(' '),
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="cf:pointer-events-none cf:size-5 cf:text-muted-foreground" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

/**
 * SelectContent renders select content inside the plugin tree.
 */
function SelectContent({
	className,
	children,
	position = 'popper',
	align = 'center',
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Content
			data-slot="select-content"
			data-align-trigger={position === 'item-aligned'}
			className={cn(
				[
					'cf:relative',
					'cf:z-[10050]',
					'cf:max-h-[min(26rem,var(--radix-select-content-available-height))]',
					'cf:min-w-[var(--radix-select-trigger-width)]',
					'cf:origin-[var(--radix-select-content-transform-origin)]',
					'cf:overflow-x-hidden',
					'cf:overflow-y-auto',
					'cf:rounded-3xl',
					'cf:border',
					'cf:border-border',
					'cf:bg-popover',
					'cf:p-1.5',
					'cf:text-popover-foreground',
					'cf:shadow-[0_28px_70px_rgba(0,0,0,0.5)]',
					'cf:ring-1',
					'cf:ring-foreground/5',
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
				position === 'popper' &&
					'cf:data-[side=bottom]:translate-y-1 cf:data-[side=left]:-translate-x-1 cf:data-[side=right]:translate-x-1 cf:data-[side=top]:-translate-y-1',
				className,
			)}
			position={position}
			align={align}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				data-position={position}
				className={cn(
					'cf:p-0',
					position === 'popper' &&
						'cf:h-[var(--radix-select-trigger-height)] cf:w-full cf:min-w-[var(--radix-select-trigger-width)]',
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	);
}

/**
 * SelectLabel renders a select group label.
 */
function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn('cf:px-3 cf:py-2.5 cf:text-sm cf:font-black cf:text-muted-foreground', className)}
			{...props}
		/>
	);
}

/**
 * SelectItem renders a select item with pointer cursor and visible checkmark.
 */
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				[
					'cf:relative',
					'cf:flex',
					'cf:w-full',
					'cf:cursor-pointer',
					'cf:select-none',
					'cf:items-center',
					'cf:gap-2.5',
					'cf:rounded-2xl',
					'cf:py-2.5',
					'cf:pr-9',
					'cf:pl-3',
					'cf:text-base',
					'cf:font-semibold',
					'cf:leading-6',
					'cf:outline-hidden',
					'cf:focus:bg-accent',
					'cf:focus:text-accent-foreground',
					'cf:not-data-[variant=destructive]:focus:**:text-accent-foreground',
					'cf:data-disabled:pointer-events-none',
					'cf:data-disabled:opacity-50',
					'cf:[&_svg]:pointer-events-none',
					'cf:[&_svg]:shrink-0',
					"cf:[&_svg:not([class*='size-'])]:size-4",
					'cf:*:[span]:last:flex',
					'cf:*:[span]:last:items-center',
					'cf:*:[span]:last:gap-2',
				].join(' '),
				className,
			)}
			{...props}
		>
			<span className="cf:pointer-events-none cf:absolute cf:top-0 cf:right-2 cf:bottom-0 cf:flex cf:w-5 cf:items-center cf:justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="cf:pointer-events-none cf:size-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

/**
 * SelectSeparator renders a select separator.
 */
function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn('cf:pointer-events-none cf:-mx-1.5 cf:my-1.5 cf:h-px cf:bg-border', className)}
			{...props}
		/>
	);
}

/**
 * SelectScrollUpButton renders the select scroll-up control.
 */
function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			className={cn(
				'cf:z-10 cf:flex cf:cursor-pointer cf:items-center cf:justify-center cf:bg-popover cf:py-1 cf:[&_svg:not([class*="size-"])]:size-4',
				className,
			)}
			{...props}
		>
			<ChevronUpIcon />
		</SelectPrimitive.ScrollUpButton>
	);
}

/**
 * SelectScrollDownButton renders the select scroll-down control.
 */
function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			className={cn(
				'cf:z-10 cf:flex cf:cursor-pointer cf:items-center cf:justify-center cf:bg-popover cf:py-1 cf:[&_svg:not([class*="size-"])]:size-4',
				className,
			)}
			{...props}
		>
			<ChevronDownIcon />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
