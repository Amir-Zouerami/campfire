import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type TextTone = 'default' | 'muted' | 'subtle' | 'danger' | 'success' | 'warning' | 'area' | 'onBrand';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const SIZE_CLASS: Readonly<Record<TextSize, string>> = {
	xs: 'cf:text-xs',
	sm: 'cf:text-[13px]',
	md: 'cf:text-sm',
	lg: 'cf:text-base',
	xl: 'cf:text-xl',
	'2xl': 'cf:text-2xl',
	'3xl': 'cf:text-3xl',
};

const TONE_CLASS: Readonly<Record<TextTone, string>> = {
	default: 'cf:text-ink',
	muted: 'cf:text-muted',
	subtle: 'cf:text-subtle',
	danger: 'cf:text-rose-ink',
	success: 'cf:text-teal-ink',
	warning: 'cf:text-flame-ink',
	area: 'cf:text-area-ink',
	onBrand: 'cf:text-on-brand',
};

const WEIGHT_CLASS: Readonly<Record<TextWeight, string>> = {
	normal: 'cf:font-normal',
	medium: 'cf:font-medium',
	semibold: 'cf:font-semibold',
	bold: 'cf:font-bold',
	extrabold: 'cf:font-extrabold',
};

type TextProps = {
	readonly children?: ReactNode;
	readonly size?: TextSize;
	readonly tone?: TextTone;
	readonly weight?: TextWeight;
	readonly as?: 'p' | 'span' | 'div' | 'strong' | 'small' | 'time' | 'dt' | 'dd';
	readonly truncate?: boolean;
	/** Tabular figures keep columns of numbers aligned. */
	readonly numeric?: boolean;
	readonly uppercase?: boolean;
	readonly align?: 'start' | 'center' | 'end';
	/** Preserves line breaks in user-authored text. */
	readonly preserveLines?: boolean;
	readonly dateTime?: string;
	/** Marks user-authored text so mixed Persian/English content picks its own direction. */
	readonly userContent?: boolean;
};

const ALIGN_CLASS = { start: 'cf:text-start', center: 'cf:text-center', end: 'cf:text-end' } as const;

/**
 * Text renders body copy with a consistent size, tone and weight.
 * User-authored strings use `dir="auto"` so mixed Persian/English content aligns correctly.
 */
export function Text(props: TextProps): ReactElement {
	const Element = props.as ?? 'span';

	return (
		<Element
			dateTime={props.dateTime}
			dir={props.userContent === true ? 'auto' : undefined}
			className={cn(
				'cf:m-0',
				SIZE_CLASS[props.size ?? 'md'],
				TONE_CLASS[props.tone ?? 'default'],
				WEIGHT_CLASS[props.weight ?? 'normal'],
				props.truncate === true && 'cf:block cf:truncate',
				props.numeric === true && 'cf:tabular-nums',
				props.uppercase === true && 'cf:text-xs cf:font-extrabold cf:uppercase cf:tracking-[0.09em]',
				props.align && ALIGN_CLASS[props.align],
				props.preserveLines === true && 'cf:whitespace-pre-line',
			)}
		>
			{props.children}
		</Element>
	);
}
