import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * twMerge is configured for the `cf` Tailwind prefix used by every Campfire utility class.
 */
const twMerge = extendTailwindMerge({ prefix: 'cf' });

/**
 * cn joins conditional class names and resolves conflicting Tailwind utilities.
 */
export function cn(...inputs: readonly ClassValue[]): string {
	return twMerge(clsx(inputs));
}
