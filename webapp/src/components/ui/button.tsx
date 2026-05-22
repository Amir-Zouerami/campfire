import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
	[
		'cf:group/button',
		'cf:inline-flex',
		'cf:shrink-0',
		'cf:cursor-pointer',
		'cf:select-none',
		'cf:items-center',
		'cf:justify-center',
		'cf:gap-2',
		'cf:whitespace-nowrap',
		'cf:rounded-3xl',
		'cf:border',
		'cf:border-transparent',
		'cf:bg-clip-padding',
		'cf:text-base',
		'cf:font-bold',
		'cf:leading-none',
		'cf:tracking-tight',
		'cf:outline-none',
		'cf:transition-all',
		'cf:active:not-aria-[haspopup]:translate-y-px',
		'cf:focus-visible:border-ring',
		'cf:focus-visible:ring-3',
		'cf:focus-visible:ring-ring/30',
		'cf:disabled:pointer-events-none',
		'cf:disabled:cursor-not-allowed',
		'cf:disabled:opacity-50',
		'cf:aria-invalid:border-destructive',
		'cf:aria-invalid:ring-3',
		'cf:aria-invalid:ring-destructive/20',
		'cf:dark:aria-invalid:border-destructive/50',
		'cf:dark:aria-invalid:ring-destructive/40',
		'cf:[&_svg]:pointer-events-none',
		'cf:[&_svg]:shrink-0',
		"cf:[&_svg:not([class*='size-'])]:size-5",
	].join(' '),
	{
		variants: {
			variant: {
				default:
					'cf:border-orange-300/35 cf:bg-orange-400/15 cf:text-orange-50 cf:shadow-[0_16px_36px_rgba(249,115,22,0.12)] cf:hover:border-orange-300/55 cf:hover:bg-orange-400/22',
				outline:
					'cf:border-border cf:bg-background/70 cf:text-foreground cf:hover:bg-muted cf:hover:text-foreground cf:aria-expanded:bg-muted cf:aria-expanded:text-foreground cf:dark:bg-transparent cf:dark:hover:bg-input/30',
				secondary:
					'cf:border-white/10 cf:bg-secondary cf:text-secondary-foreground cf:hover:bg-secondary/80 cf:aria-expanded:bg-secondary cf:aria-expanded:text-secondary-foreground',
				ghost: 'cf:border-transparent cf:bg-transparent cf:text-foreground cf:hover:bg-muted cf:hover:text-foreground cf:aria-expanded:bg-muted cf:aria-expanded:text-foreground cf:dark:hover:bg-muted/50',
				destructive:
					'cf:border-destructive/20 cf:bg-destructive/10 cf:text-destructive cf:hover:bg-destructive/20 cf:focus-visible:border-destructive/40 cf:focus-visible:ring-destructive/20 cf:dark:bg-destructive/20 cf:dark:hover:bg-destructive/30 cf:dark:focus-visible:ring-destructive/40',
				link: 'cf:h-auto cf:rounded-none cf:border-transparent cf:bg-transparent cf:p-0 cf:text-primary cf:underline-offset-4 cf:hover:underline',
			},
			size: {
				default: 'cf:h-11 cf:px-4 cf:has-data-[icon=inline-end]:pr-3 cf:has-data-[icon=inline-start]:pl-3',
				xs: 'cf:h-8 cf:gap-1.5 cf:px-3 cf:text-sm cf:has-data-[icon=inline-end]:pr-2.5 cf:has-data-[icon=inline-start]:pl-2.5 cf:[&_svg:not([class*="size-"])]:size-4',
				sm: 'cf:h-10 cf:gap-1.5 cf:px-3.5 cf:has-data-[icon=inline-end]:pr-3 cf:has-data-[icon=inline-start]:pl-3',
				lg: 'cf:h-12 cf:gap-2 cf:px-5 cf:text-lg cf:has-data-[icon=inline-end]:pr-4 cf:has-data-[icon=inline-start]:pl-4',
				icon: 'cf:size-11',
				'icon-xs': 'cf:size-8 cf:[&_svg:not([class*="size-"])]:size-4',
				'icon-sm': 'cf:size-10',
				'icon-lg': 'cf:size-12',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

/**
 * Button renders the shadcn button primitive with the Campfire Tailwind prefix.
 */
function Button({
	className,
	variant = 'default',
	size = 'default',
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : 'button';

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
