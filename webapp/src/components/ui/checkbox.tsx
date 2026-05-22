import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { CheckIcon } from 'lucide-react';

/**
 * Checkbox renders the shadcn checkbox primitive with the Campfire Tailwind prefix.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				[
					'cf:peer',
					'cf:relative',
					'cf:flex',
					'cf:size-5',
					'cf:shrink-0',
					'cf:cursor-pointer',
					'cf:items-center',
					'cf:justify-center',
					'cf:rounded-lg',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/75',
					'cf:text-primary-foreground',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
					'cf:outline-none',
					'cf:transition-all',
					'cf:after:absolute',
					'cf:after:-inset-x-3',
					'cf:after:-inset-y-2',
					'cf:group-has-disabled/field:opacity-50',
					'cf:hover:border-orange-300/35',
					'cf:focus-visible:border-ring',
					'cf:focus-visible:ring-3',
					'cf:focus-visible:ring-ring/30',
					'cf:disabled:cursor-not-allowed',
					'cf:disabled:opacity-50',
					'cf:aria-invalid:border-destructive',
					'cf:aria-invalid:ring-3',
					'cf:aria-invalid:ring-destructive/20',
					'cf:aria-invalid:aria-checked:border-primary',
					'cf:data-checked:border-orange-300/45',
					'cf:data-checked:bg-orange-400/25',
					'cf:data-checked:text-orange-50',
					'cf:dark:aria-invalid:border-destructive/50',
					'cf:dark:aria-invalid:ring-destructive/40',
				].join(' '),
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="cf:grid cf:place-content-center cf:text-current cf:transition-none cf:[&>svg]:size-4"
			>
				<CheckIcon />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
