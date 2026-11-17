import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';

import { Text } from '../layout/Text';
import { Icon } from '../primitives/Icon';

const TONE = {
	info: { box: 'cf:bg-surface cf:border-line', icon: Info, iconTone: 'muted' },
	success: { box: 'cf:bg-teal-soft cf:border-teal-soft', icon: CheckCircle2, iconTone: 'success' },
	warning: { box: 'cf:bg-flame-soft cf:border-flame-soft', icon: AlertTriangle, iconTone: 'warning' },
	danger: { box: 'cf:bg-rose-soft cf:border-rose-soft', icon: XCircle, iconTone: 'danger' },
} as const;

type NoticeProps = {
	readonly tone?: keyof typeof TONE;
	readonly title?: string;
	readonly children?: ReactNode;
	/** Trailing action such as a retry button. */
	readonly action?: ReactNode;
};

/**
 * Notice is an inline message about the state of the surrounding content.
 */
export function Notice(props: NoticeProps): ReactElement {
	const tone = TONE[props.tone ?? 'info'];

	return (
		<div
			role={props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status'}
			className={cn('cf:flex cf:items-start cf:gap-3 cf:rounded-control cf:border cf:px-3.5 cf:py-3', tone.box)}
		>
			<span className="cf:mt-0.5">
				<Icon icon={tone.icon} size="md" tone={tone.iconTone} />
			</span>
			<div className="cf:flex cf:min-w-0 cf:flex-1 cf:flex-col cf:gap-0.5">
				{props.title !== undefined && <Text weight="bold">{props.title}</Text>}
				{props.children !== undefined && (
					<Text as="div" size="md" tone="default">
						{props.children}
					</Text>
				)}
			</div>
			{props.action}
		</div>
	);
}
