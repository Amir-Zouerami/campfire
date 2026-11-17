import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { cn } from '@/shared/lib/cn';

const SIZE_CLASS = {
	xs: 'cf:size-3.5',
	sm: 'cf:size-4',
	md: 'cf:size-[18px]',
	lg: 'cf:size-5',
	xl: 'cf:size-6',
} as const;

type IconProps = {
	readonly icon: LucideIcon;
	readonly size?: keyof typeof SIZE_CLASS;
	/** Flips the glyph in right-to-left layouts (arrows, chevrons). */
	readonly mirror?: boolean;
	readonly tone?: 'inherit' | 'muted' | 'area' | 'danger' | 'success' | 'warning';
};

const TONE_CLASS = {
	inherit: '',
	muted: 'cf:text-muted',
	area: 'cf:text-area',
	danger: 'cf:text-rose',
	success: 'cf:text-teal',
	warning: 'cf:text-flame',
} as const;

/**
 * Icon renders a decorative lucide glyph at a standard size. Icons that carry meaning
 * must be paired with visible text or an accessible label on their parent control.
 */
export function Icon(props: IconProps): ReactElement {
	const Glyph = props.icon;

	return (
		<Glyph
			aria-hidden="true"
			strokeWidth={1.9}
			className={cn(
				'cf:shrink-0',
				SIZE_CLASS[props.size ?? 'md'],
				TONE_CLASS[props.tone ?? 'inherit'],
				props.mirror === true && 'cf:rtl:-scale-x-100',
			)}
		/>
	);
}
