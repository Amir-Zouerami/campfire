'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Checkbox renders the shadcn checkbox primitive with Campfire-safe prefixed classes.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				[
					'cf:inline-flex',
					'cf:size-5',
					'cf:min-size-5',
					'cf:shrink-0',
					'cf:cursor-pointer',
					'cf:items-center',
					'cf:justify-center',
					'cf:align-middle',
					'cf:rounded-lg',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/80',
					'cf:text-orange-50',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
					'cf:outline-none',
					'cf:transition-all',
					'cf:hover:border-orange-300/40',
					'cf:focus-visible:border-ring',
					'cf:focus-visible:ring-3',
					'cf:focus-visible:ring-ring/30',
					'cf:disabled:cursor-not-allowed',
					'cf:disabled:opacity-50',
					'cf:data-checked:border-orange-300/50',
					'cf:data-checked:bg-orange-400/25',
					'cf:data-checked:text-orange-50',
					'cf:aria-invalid:border-destructive',
					'cf:aria-invalid:ring-3',
					'cf:aria-invalid:ring-destructive/20',
					'cf:dark:aria-invalid:border-destructive/50',
					'cf:dark:aria-invalid:ring-destructive/40',
				].join(' '),
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="cf:flex cf:items-center cf:justify-center cf:leading-none cf:text-current"
			>
				<CheckIcon className="cf:size-4" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
