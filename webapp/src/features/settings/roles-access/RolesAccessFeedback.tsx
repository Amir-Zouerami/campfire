import type { ReactElement } from 'react';

import { CampfireFeedback, CampfireLoadingFeedback } from '@/components/campfire/CampfireFeedback';

import type { RolesAccessLoadState } from './roles-access.types';

/**
 * RolesAccessFeedbackProps contains roles/access feedback state.
 */
type RolesAccessFeedbackProps = {
	readonly state: RolesAccessLoadState;
	readonly message: string;
	readonly profileErrorMessage: string;
};

/**
 * RolesAccessFeedback renders roles/access feedback.
 */
export function RolesAccessFeedback(props: RolesAccessFeedbackProps): ReactElement | null {
	const messages = [props.message.trim(), props.profileErrorMessage.trim()].filter(Boolean);

	if (messages.length === 0) {
		return null;
	}

	return (
		<div className="cf:grid cf:gap-2">
			{messages.map(message => (
				<CampfireFeedback
					key={message}
					message={message}
					tone={props.state === 'error' ? 'error' : 'success'}
				/>
			))}
		</div>
	);
}

/**
 * RolesAccessLoading renders a compact loading state.
 */
export function RolesAccessLoading(): ReactElement {
	return <CampfireLoadingFeedback message="Loading workspace roles…" />;
}
