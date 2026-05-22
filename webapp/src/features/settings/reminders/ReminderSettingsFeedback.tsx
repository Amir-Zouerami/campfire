import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ReminderSettingsLoadState } from './reminders.types';

/**
 * ReminderSettingsFeedbackProps contains reminder settings feedback state.
 */
type ReminderSettingsFeedbackProps = {
	readonly state: ReminderSettingsLoadState;
	readonly message: string;
};

/**
 * ReminderSettingsFeedback renders reminder settings success and error messages.
 */
export function ReminderSettingsFeedback(props: ReminderSettingsFeedbackProps): ReactElement | null {
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
 * ReminderSettingsLoading renders a compact loading state.
 */
export function ReminderSettingsLoading(): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			Loading reminder settings…
		</div>
	);
}
