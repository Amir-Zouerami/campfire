'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			// Added your custom 'campfire-input' class to perfectly match your Textareas/Inputs
			className={cn(
				'cf:flex cf:w-full cf:items-center cf:justify-between cf:px-3 cf:py-2 cf:text-sm cf:shadow-sm cf:ring-offset-background cf:placeholder:text-muted-foreground cf:focus:outline-none cf:focus:ring-1 cf:focus:ring-ring cf:disabled:cursor-not-allowed cf:disabled:opacity-50 [&>span]:line-clamp-1 campfire-input',
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="cf:h-4 cf:w-4 cf:opacity-50" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = 'popper',
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Content
			data-slot="select-content"
			// Note: Portal is removed to fix Mattermost transparency, cf: prefixes added
			className={cn(
				'cf:relative cf:z-[99999] cf:max-h-96 cf:min-w-[8rem] cf:overflow-hidden cf:rounded-md cf:border cf:bg-popover cf:text-popover-foreground cf:shadow-md cf:data-[state=open]:animate-in cf:data-[state=closed]:animate-out cf:data-[state=closed]:fade-out-0 cf:data-[state=open]:fade-in-0 cf:data-[state=closed]:zoom-out-95 cf:data-[state=open]:zoom-in-95 cf:data-[side=bottom]:slide-in-from-top-2 cf:data-[side=left]:slide-in-from-right-2 cf:data-[side=right]:slide-in-from-left-2 cf:data-[side=top]:slide-in-from-bottom-2',
				position === 'popper' &&
					'cf:data-[side=bottom]:translate-y-1 cf:data-[side=left]:-translate-x-1 cf:data-[side=right]:translate-x-1 cf:data-[side=top]:-translate-y-1',
				className,
			)}
			position={position}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				className={cn(
					'cf:p-1',
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

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn('cf:px-2 cf:py-1.5 cf:text-sm cf:font-semibold', className)}
			{...props}
		/>
	);
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			// Changed to cursor-pointer and added cf: prefixes
			className={cn(
				'cf:relative cf:flex cf:w-full cf:cursor-pointer cf:select-none cf:items-center cf:rounded-sm cf:py-2 cf:pl-8 cf:pr-2 cf:text-sm cf:outline-none cf:focus:bg-accent cf:focus:text-accent-foreground cf:data-[disabled]:pointer-events-none cf:data-[disabled]:opacity-50',
				className,
			)}
			{...props}
		>
			<span className="cf:absolute cf:left-2 cf:flex cf:h-3.5 cf:w-3.5 cf:items-center cf:justify-center">
				<SelectPrimitive.ItemIndicator>
					<CheckIcon className="cf:h-4 cf:w-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn('cf:-mx-1 cf:my-1 cf:h-px cf:bg-muted', className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			className={cn('cf:flex cf:cursor-pointer cf:items-center cf:justify-center cf:py-1', className)}
			{...props}
		>
			<ChevronUpIcon className="cf:h-4 cf:w-4" />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			className={cn('cf:flex cf:cursor-pointer cf:items-center cf:justify-center cf:py-1', className)}
			{...props}
		>
			<ChevronDownIcon className="cf:h-4 cf:w-4" />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton,
};
