import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { TeamStandupsLoadState } from './team-standups.types';

/**
 * TeamStandupsFeedbackProps contains standup review feedback state.
 */
type TeamStandupsFeedbackProps = {
	readonly state: TeamStandupsLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * TeamStandupsFeedback renders standup review feedback and profile warnings.
 */
export function TeamStandupsFeedback(props: TeamStandupsFeedbackProps): ReactElement | null {
	const messages = [props.message.trim(), props.profileErrorMessage.trim()].filter(Boolean);

	if (messages.length === 0) {
		return null;
	}

	const isError = props.state === 'error';

	return (
		<div className="cf:grid cf:gap-2">
			{messages.map(message => (
				<div
					key={message}
					className={cn(
						'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
						isError
							? 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100'
							: 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100',
					)}
				>
					{isError ? <AlertTriangle className="cf:size-4" /> : <CheckCircle2 className="cf:size-4" />}
					{message}
				</div>
			))}
		</div>
	);
}

/**
 * TeamStandupsLoading renders a compact loading state.
 */
export function TeamStandupsLoading(): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			Loading standup submissions…
		</div>
	);
}
