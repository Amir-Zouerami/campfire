'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Separator renders the shadcn separator primitive with the Campfire Tailwind prefix.
 */
function Separator({
	className,
	orientation = 'horizontal',
	decorative = true,
	...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
	return (
		<SeparatorPrimitive.Root
			data-slot="separator-root"
			decorative={decorative}
			orientation={orientation}
			className={cn(
				[
					'cf:shrink-0',
					'cf:bg-border',
					'cf:data-[orientation=horizontal]:h-px',
					'cf:data-[orientation=horizontal]:w-full',
					'cf:data-[orientation=vertical]:h-full',
					'cf:data-[orientation=vertical]:w-px',
				].join(' '),
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
