import type { ReactElement } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { MyTimeLoadState } from './my-time.types';

/**
 * MyTimeFeedbackProps contains user-facing tasks/time feedback state.
 */
type MyTimeFeedbackProps = {
	readonly state: MyTimeLoadState;
	readonly message: string;
};

/**
 * MyTimeFeedback renders status and error feedback for the time-log flow.
 */
export function MyTimeFeedback(props: MyTimeFeedbackProps): ReactElement | null {
	if (props.message.trim() === '') {
		return null;
	}

	const isError = props.state === 'error';

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				isError
					? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
					: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
			)}
		>
			{isError ? null : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * MyTimeLoading renders a compact loading state.
 */
export function MyTimeLoading(): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			Loading tasks and recent time…
		</div>
	);
}
