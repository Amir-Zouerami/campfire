import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * CampfireFeedbackTone controls the visual state for inline feedback.
 */
export type CampfireFeedbackTone = 'error' | 'success' | 'warning';

/**
 * CampfireFeedbackProps contains one inline user-facing feedback message.
 */
type CampfireFeedbackProps = {
	readonly message: string;
	readonly tone: CampfireFeedbackTone;
};

/**
 * CampfireFeedback renders a consistent inline success, warning, or error message.
 */
export function CampfireFeedback(props: CampfireFeedbackProps): ReactElement | null {
	if (props.message.trim() === '') {
		return null;
	}

	return (
		<div
			className={cn(
				'cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-black',
				feedbackToneClassName(props.tone),
			)}
		>
			{feedbackIcon(props.tone)}
			{props.message}
		</div>
	);
}

/**
 * CampfireLoadingFeedbackProps contains one compact loading message.
 */
type CampfireLoadingFeedbackProps = {
	readonly message: string;
};

/**
 * CampfireLoadingFeedback renders a consistent compact loading message.
 */
export function CampfireLoadingFeedback(props: CampfireLoadingFeedbackProps): ReactElement {
	return (
		<div className="cf:flex cf:items-center cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4 cf:text-sm cf:font-bold cf:text-slate-300">
			<Loader2 className="cf:size-4 cf:animate-spin cf:text-amber-200" />
			{props.message}
		</div>
	);
}

/**
 * feedbackToneClassName returns the visual classes for one feedback tone.
 */
function feedbackToneClassName(tone: CampfireFeedbackTone): string {
	switch (tone) {
		case 'error':
			return 'cf:border-red-300/25 cf:bg-red-950/30 cf:text-red-100';

		case 'success':
			return 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100';

		case 'warning':
			return 'cf:border-amber-300/25 cf:bg-amber-950/30 cf:text-amber-100';
	}
}

/**
 * feedbackIcon returns the icon for one feedback tone.
 */
function feedbackIcon(tone: CampfireFeedbackTone): ReactElement {
	switch (tone) {
		case 'error':
			return <AlertTriangle className="cf:size-4" />;

		case 'success':
		case 'warning':
			return <CheckCircle2 className="cf:size-4" />;
	}
}
