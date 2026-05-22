import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Textarea renders the shadcn textarea primitive with the Campfire Tailwind prefix.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				[
					'cf:flex',
					'cf:min-h-32',
					'cf:w-full',
					'cf:resize-y',
					'cf:rounded-2xl',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/75',
					'cf:px-4',
					'cf:py-4',
					'cf:text-base',
					'cf:font-semibold',
					'cf:leading-7',
					'cf:text-foreground',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
					'cf:outline-none',
					'cf:transition-[color,box-shadow,background-color,border-color]',
					'cf:placeholder:text-muted-foreground',
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
					'cf:dark:aria-invalid:border-destructive/50',
					'cf:dark:aria-invalid:ring-destructive/40',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
