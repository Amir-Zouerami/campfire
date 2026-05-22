import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card renders a Campfire-prefixed shadcn card surface.
 */
function Card({
	className,
	size = 'default',
	...props
}: React.ComponentProps<'div'> & { readonly size?: 'default' | 'sm' }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			className={cn(
				[
					'cf:group/card',
					'cf:flex',
					'cf:flex-col',
					'cf:gap-6',
					'cf:overflow-hidden',
					'cf:rounded-4xl',
					'cf:border',
					'cf:border-border',
					'cf:bg-card',
					'cf:py-6',
					'cf:text-base',
					'cf:text-card-foreground',
					'cf:shadow-[0_20px_56px_rgba(0,0,0,0.28)]',
					'cf:ring-1',
					'cf:ring-foreground/5',
					'cf:has-[>img:first-child]:pt-0',
					'cf:data-[size=sm]:gap-4',
					'cf:data-[size=sm]:py-4',
					'cf:dark:ring-foreground/10',
					'cf:*:[img:first-child]:rounded-t-4xl',
					'cf:*:[img:last-child]:rounded-b-4xl',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * CardHeader renders a card heading area.
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				[
					'cf:group/card-header',
					'cf:grid',
					'cf:auto-rows-min',
					'cf:items-start',
					'cf:gap-2',
					'cf:rounded-t-4xl',
					'cf:px-6',
					'cf:group-data-[size=sm]/card:px-4',
					'cf:has-data-[slot=card-action]:grid-cols-[1fr_auto]',
					'cf:has-data-[slot=card-description]:grid-rows-[auto_auto]',
					'cf:[.border-b]:pb-6',
					'cf:group-data-[size=sm]/card:[.border-b]:pb-4',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

/**
 * CardTitle renders the main title text.
 */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn('cf:font-heading cf:text-xl cf:font-black cf:leading-tight cf:tracking-tight', className)}
			{...props}
		/>
	);
}

/**
 * CardDescription renders secondary card text.
 */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('cf:text-base cf:font-medium cf:leading-7 cf:text-muted-foreground', className)}
			{...props}
		/>
	);
}

/**
 * CardAction renders the card action slot.
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn('cf:col-start-2 cf:row-span-2 cf:row-start-1 cf:self-start cf:justify-self-end', className)}
			{...props}
		/>
	);
}

/**
 * CardContent renders the main card body.
 */
function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('cf:px-6 cf:group-data-[size=sm]/card:px-4', className)}
			{...props}
		/>
	);
}

/**
 * CardFooter renders the card footer.
 */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn('cf:flex cf:items-center cf:px-6 cf:group-data-[size=sm]/card:px-4', className)}
			{...props}
		/>
	);
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
