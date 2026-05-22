import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Input renders the shadcn input primitive with the Campfire Tailwind prefix.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				[
					'cf:h-12',
					'cf:w-full',
					'cf:min-w-0',
					'cf:rounded-2xl',
					'cf:border',
					'cf:border-input',
					'cf:bg-background/75',
					'cf:px-4',
					'cf:py-2',
					'cf:text-base',
					'cf:font-semibold',
					'cf:text-foreground',
					'cf:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
					'cf:outline-none',
					'cf:transition-[color,box-shadow,background-color,border-color]',
					'cf:file:inline-flex',
					'cf:file:h-8',
					'cf:file:border-0',
					'cf:file:bg-transparent',
					'cf:file:text-sm',
					'cf:file:font-bold',
					'cf:file:text-foreground',
					'cf:placeholder:text-muted-foreground',
					'cf:hover:border-white/20',
					'cf:hover:bg-background/90',
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
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
