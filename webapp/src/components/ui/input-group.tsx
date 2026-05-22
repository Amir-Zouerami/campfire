import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * InputGroupAddonAlign describes where addon content sits inside an input group.
 */
type InputGroupAddonAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end';

/**
 * InputGroupButtonSize describes compact input-group button sizes.
 */
type InputGroupButtonSize = 'xs' | 'sm' | 'icon-xs' | 'icon-sm';

/**
 * InputGroup renders a grouped input surface with the Campfire Tailwind prefix.
 */
function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="input-group"
			role="group"
			className={cn(
				[
					'cf:group/input-group',
					'cf:relative',
					'cf:flex',
					'cf:min-h-12',
					'cf:w-full',
					'cf:min-w-0',
					'cf:items-center',
					'cf:gap-2',
					'cf:rounded-2xl',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/75',
					'cf:px-3',
					'cf:text-foreground',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
					'cf:outline-none',
					'cf:transition-[color,box-shadow,background-color,border-color]',
					'cf:hover:border-white/20',
					'cf:hover:bg-background/90',
					'cf:focus-within:border-ring',
					'cf:focus-within:ring-3',
					'cf:focus-within:ring-ring/30',
					'cf:has-aria-invalid:border-destructive',
					'cf:has-aria-invalid:ring-3',
					'cf:has-aria-invalid:ring-destructive/20',
					'cf:dark:has-aria-invalid:border-destructive/50',
					'cf:dark:has-aria-invalid:ring-destructive/40',
					'cf:in-data-[slot=combobox-content]:focus-within:border-inherit',
					'cf:in-data-[slot=combobox-content]:focus-within:ring-0',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * InputGroupAddon renders a non-input addon inside an input group.
 */
function InputGroupAddon({
	className,
	align = 'inline-start',
	onClick,
	...props
}: React.ComponentProps<'div'> & {
	readonly align?: InputGroupAddonAlign;
}) {
	function handleClick(event: React.MouseEvent<HTMLDivElement>): void {
		onClick?.(event);

		if (event.defaultPrevented) {
			return;
		}

		if ((event.target as HTMLElement).closest('button')) {
			return;
		}

		event.currentTarget.parentElement?.querySelector('input')?.focus();
	}

	return (
		<div
			role="group"
			data-slot="input-group-addon"
			data-align={align}
			className={cn(inputGroupAddonClassName(align), className)}
			onClick={handleClick}
			{...props}
		/>
	);
}

/**
 * InputGroupButton renders a button inside an input group.
 */
function InputGroupButton({
	className,
	type = 'button',
	variant = 'ghost',
	size = 'xs',
	...props
}: Omit<React.ComponentProps<typeof Button>, 'size'> & {
	readonly size?: InputGroupButtonSize;
}) {
	return (
		<Button
			type={type}
			data-size={size}
			variant={variant}
			size={inputGroupButtonBaseSize(size)}
			className={cn(inputGroupButtonClassName(size), className)}
			{...props}
		/>
	);
}

/**
 * InputGroupText renders helper text inside an input group.
 */
function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="input-group-text"
			className={cn(
				[
					'cf:flex',
					'cf:items-center',
					'cf:gap-2',
					'cf:text-sm',
					'cf:font-semibold',
					'cf:text-muted-foreground',
					'cf:[&_svg]:pointer-events-none',
					"cf:[&_svg:not([class*='size-'])]:size-4",
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * InputGroupInput renders an input inside an input group.
 */
function InputGroupInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	return (
		<Input
			data-slot="input-group-control"
			className={cn(
				[
					'cf:h-10',
					'cf:flex-1',
					'cf:border-0',
					'cf:bg-transparent',
					'cf:px-0',
					'cf:shadow-none',
					'cf:ring-0',
					'cf:hover:bg-transparent',
					'cf:focus-visible:ring-0',
					'cf:aria-invalid:ring-0',
					'cf:dark:bg-transparent',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * InputGroupTextarea renders a textarea inside an input group.
 */
function InputGroupTextarea({ className, ...props }: React.ComponentProps<typeof Textarea>) {
	return (
		<Textarea
			data-slot="input-group-control"
			className={cn(
				[
					'cf:min-h-24',
					'cf:flex-1',
					'cf:resize-none',
					'cf:border-0',
					'cf:bg-transparent',
					'cf:px-0',
					'cf:py-3',
					'cf:shadow-none',
					'cf:ring-0',
					'cf:hover:bg-transparent',
					'cf:focus-visible:ring-0',
					'cf:aria-invalid:ring-0',
					'cf:dark:bg-transparent',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * inputGroupAddonClassName returns classes for addon alignment.
 */
function inputGroupAddonClassName(align: InputGroupAddonAlign): string {
	const baseClassName = [
		'cf:flex',
		'cf:shrink-0',
		'cf:items-center',
		'cf:justify-center',
		'cf:gap-2',
		'cf:text-muted-foreground',
		'cf:[&_svg]:pointer-events-none',
		"cf:[&_svg:not([class*='size-'])]:size-5",
	].join(' ');

	switch (align) {
		case 'inline-end':
			return `${baseClassName} cf:ml-auto`;

		case 'block-start':
			return `${baseClassName} cf:self-start cf:pt-2`;

		case 'block-end':
			return `${baseClassName} cf:self-end cf:pb-2`;

		case 'inline-start':
			return baseClassName;
	}
}

/**
 * inputGroupButtonClassName returns compact button classes.
 */
function inputGroupButtonClassName(size: InputGroupButtonSize): string {
	const baseClassName = [
		'cf:rounded-xl',
		'cf:border-transparent',
		'cf:bg-transparent',
		'cf:text-muted-foreground',
		'cf:shadow-none',
		'cf:hover:bg-muted',
		'cf:hover:text-foreground',
		'cf:data-pressed:bg-transparent',
	].join(' ');

	switch (size) {
		case 'icon-xs':
			return `${baseClassName} cf:size-8 cf:p-0 cf:[&>svg:not([class*='size-'])]:size-4`;

		case 'icon-sm':
			return `${baseClassName} cf:size-9 cf:p-0 cf:[&>svg:not([class*='size-'])]:size-4`;

		case 'sm':
			return `${baseClassName} cf:h-9 cf:px-3 cf:text-sm`;

		case 'xs':
			return `${baseClassName} cf:h-8 cf:px-2.5 cf:text-sm`;
	}
}

/**
 * inputGroupButtonBaseSize maps input-group compact sizes to Button sizes.
 */
function inputGroupButtonBaseSize(size: InputGroupButtonSize): React.ComponentProps<typeof Button>['size'] {
	switch (size) {
		case 'icon-xs':
			return 'icon-xs';

		case 'icon-sm':
			return 'icon-sm';

		case 'sm':
			return 'sm';

		case 'xs':
			return 'xs';
	}
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };
