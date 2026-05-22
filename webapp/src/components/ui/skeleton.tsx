import { cn } from '@/lib/utils';

/**
 * Skeleton renders a Campfire-prefixed loading placeholder.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div data-slot="skeleton" className={cn('cf:animate-pulse cf:rounded-2xl cf:bg-muted', className)} {...props} />
	);
}

export { Skeleton };
