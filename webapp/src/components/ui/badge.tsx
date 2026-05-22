import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
	[
		'cf:group/badge',
		'cf:inline-flex',
		'cf:h-6',
		'cf:w-fit',
		'cf:shrink-0',
		'cf:items-center',
		'cf:justify-center',
		'cf:gap-1',
		'cf:overflow-hidden',
		'cf:rounded-3xl',
		'cf:border',
		'cf:border-transparent',
		'cf:px-2.5',
		'cf:py-0.5',
		'cf:text-sm',
		'cf:font-bold',
		'cf:leading-none',
		'cf:whitespace-nowrap',
		'cf:transition-all',
		'cf:focus-visible:border-ring',
		'cf:focus-visible:ring-[3px]',
		'cf:focus-visible:ring-ring/50',
		'cf:has-data-[icon=inline-end]:pr-2',
		'cf:has-data-[icon=inline-start]:pl-2',
		'cf:aria-invalid:border-destructive',
		'cf:aria-invalid:ring-destructive/20',
		'cf:dark:aria-invalid:ring-destructive/40',
		'cf:[&>svg]:pointer-events-none',
		'cf:[&>svg]:size-3.5!',
	].join(' '),
	{
		variants: {
			variant: {
				default: 'cf:border-orange-300/25 cf:bg-orange-400/15 cf:text-orange-50 cf:[a]:hover:bg-orange-400/20',
				secondary:
					'cf:border-white/10 cf:bg-secondary cf:text-secondary-foreground cf:[a]:hover:bg-secondary/80',
				destructive:
					'cf:border-destructive/20 cf:bg-destructive/10 cf:text-destructive cf:focus-visible:ring-destructive/20 cf:dark:bg-destructive/20 cf:dark:focus-visible:ring-destructive/40 cf:[a]:hover:bg-destructive/20',
				outline: 'cf:border-border cf:text-foreground cf:[a]:hover:bg-muted cf:[a]:hover:text-muted-foreground',
				ghost: 'cf:hover:bg-muted cf:hover:text-muted-foreground cf:dark:hover:bg-muted/50',
				link: 'cf:text-primary cf:underline-offset-4 cf:hover:underline',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

/**
 * Badge renders the shadcn badge primitive with the Campfire Tailwind prefix.
 */
function Badge({
	className,
	variant = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'span'> &
	VariantProps<typeof badgeVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : 'span';

	return (
		<Comp
			data-slot="badge"
			data-variant={variant}
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
