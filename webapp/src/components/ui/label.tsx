'use client';

import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Label renders the shadcn label primitive with the Campfire Tailwind prefix.
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			data-slot="label"
			className={cn(
				[
					'cf:flex',
					'cf:select-none',
					'cf:items-center',
					'cf:gap-2',
					'cf:text-base',
					'cf:font-bold',
					'cf:leading-none',
					'cf:text-foreground',
					'cf:tracking-tight',
					'cf:group-data-[disabled=true]:pointer-events-none',
					'cf:group-data-[disabled=true]:opacity-50',
					'cf:peer-disabled:cursor-not-allowed',
					'cf:peer-disabled:opacity-50',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
