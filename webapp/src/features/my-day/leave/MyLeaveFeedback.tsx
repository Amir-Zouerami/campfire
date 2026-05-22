import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { MyLeaveLoadState, MyLeaveWarning } from './my-leave.types';

/**
 * MyLeaveFeedbackProps contains user-facing leave feedback state.
 */
type MyLeaveFeedbackProps = {
	readonly state: MyLeaveLoadState;
	readonly message: string;
};

/**
 * MyLeaveFeedback renders status and error feedback for the leave flow.
 */
export function MyLeaveFeedback(props: MyLeaveFeedbackProps): ReactElement | null {
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
			{isError ? <AlertTriangle className="cf:size-4" /> : <CheckCircle2 className="cf:size-4" />}
			{props.message}
		</div>
	);
}

/**
 * MyLeaveWarnings renders non-blocking local leave warnings.
 */
export function MyLeaveWarnings(props: { readonly warnings: readonly MyLeaveWarning[] }): ReactElement | null {
	if (props.warnings.length === 0) {
		return null;
	}

	return (
		<div className="cf:grid cf:gap-2">
			{props.warnings.map(warning => (
				<div
					key={`${warning.kind}-${warning.message}`}
					className="cf:flex cf:items-start cf:gap-2 cf:rounded-2xl cf:border cf:border-amber-300/25 cf:bg-amber-950/25 cf:px-4 cf:py-3 cf:text-sm cf:font-bold cf:text-amber-100"
				>
					<AlertTriangle className="cf:mt-0.5 cf:size-4 cf:shrink-0" />
					<span>{warning.message}</span>
				</div>
			))}
		</div>
	);
}

/**
 * MyLeaveLoading renders a compact loading state.
 */
export function MyLeaveLoading(): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			Loading your leave options…
		</div>
	);
}
