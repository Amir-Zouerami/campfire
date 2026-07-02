import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { CampfireInlineLoading } from '@/components/campfire/CampfireLoading';
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
	readonly showInlineError?: boolean;
};

/**
 * CampfireFeedbackItem contains one normalized feedback message.
 */
type CampfireFeedbackItem = CampfireFeedbackProps & {
	readonly key?: string;
};

/**
 * CampfireFeedbackListProps contains a compact stack of feedback messages.
 */
type CampfireFeedbackListProps = {
	readonly items: readonly CampfireFeedbackItem[];
};

/**
 * CampfireLoadingFeedbackProps contains one compact loading message.
 */
type CampfireLoadingFeedbackProps = {
	readonly message: string;
};

/**
 * CampfireFeedback renders compact inline feedback.
 *
 * Server and network errors are intentionally handled by CampfireToastHost so
 * page layout does not jump. Keep inline errors only for field-level validation
 * by passing showInlineError when a specific form needs it.
 */
export function CampfireFeedback(props: CampfireFeedbackProps): ReactElement | null {
	const message = props.message.trim();

	if (message === '') {
		return null;
	}

	if (props.tone === 'success') {
		return null;
	}

	if (props.tone === 'error' && props.showInlineError !== true) {
		return null;
	}

	const liveRegionRole = props.tone === 'warning' ? 'status' : 'status';

	return (
		<div
			className={cn(
				'campfire-inline-feedback cf:flex cf:items-center cf:gap-2 cf:rounded-2xl cf:border cf:px-4 cf:py-3 cf:text-sm cf:font-medium',
				feedbackToneClassName(props.tone),
			)}
			role={liveRegionRole}
			aria-live="polite"
		>
			{feedbackIcon(props.tone)}
			<span dir="auto">{message}</span>
		</div>
	);
}

/**
 * CampfireFeedbackList renders a stable feedback stack without repeated page
 * implementations. Empty and hidden server-error items are ignored.
 */
export function CampfireFeedbackList(props: CampfireFeedbackListProps): ReactElement | null {
	const items = props.items.filter(item => {
		const hasMessage = item.message.trim() !== '';
		const isHiddenServerError = item.tone === 'error' && item.showInlineError !== true;

		return hasMessage && !isHiddenServerError;
	});

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="campfire-inline-feedback-list cf:grid cf:gap-2">
			{items.map((item, index) => (
				<CampfireFeedback
					key={item.key ?? `${item.tone}-${index}-${item.message}`}
					message={item.message}
					tone={item.tone}
					showInlineError={item.showInlineError}
				/>
			))}
		</div>
	);
}

/**
 * CampfireLoadingFeedback renders a consistent compact loading message.
 */
export function CampfireLoadingFeedback(props: CampfireLoadingFeedbackProps): ReactElement {
	return (
		<div className="campfire-loading-feedback cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/5 cf:p-4">
			<CampfireInlineLoading label={props.message} />
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
			return 'cf:border-amber-300/20 cf:bg-amber-950/15 cf:text-amber-100';

		case 'warning':
			return 'cf:border-amber-300/25 cf:bg-amber-950/20 cf:text-amber-100';
	}
}

/**
 * feedbackIcon returns the icon for one feedback tone.
 */
function feedbackIcon(tone: CampfireFeedbackTone): ReactElement {
	switch (tone) {
		case 'error':
			return <AlertTriangle className="cf:size-4 cf:shrink-0" />;

		case 'success':
			return <CheckCircle2 className="cf:size-4 cf:shrink-0" />;

		case 'warning':
			return <AlertTriangle className="cf:size-4 cf:shrink-0" />;
	}
}
