import type { ReactElement } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * TeamStandupsAttentionStripProps contains compact people status summaries.
 */
type TeamStandupsAttentionStripProps = {
	readonly missingUserIDs: readonly string[];
	readonly onLeaveUserIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupsAttentionStrip renders missing and on-leave users without nested cards.
 */
export function TeamStandupsAttentionStrip(props: TeamStandupsAttentionStripProps): ReactElement {
	return (
		<section className="campfire-attention-strip" aria-label="Team standup attention summary">
			<AttentionGroup
				label="Missing"
				description="Need follow-up"
				tone="red"
				userIDs={props.missingUserIDs}
				emptyLabel="Nobody missing"
				labelForUserID={props.labelForUserID}
			/>
			<AttentionGroup
				label="On leave"
				description="Skipped from missing"
				tone="slate"
				userIDs={props.onLeaveUserIDs}
				emptyLabel="Nobody on leave"
				labelForUserID={props.labelForUserID}
			/>
		</section>
	);
}

/**
 * AttentionGroup renders one compact group inside the attention strip.
 */
function AttentionGroup(props: {
	readonly label: string;
	readonly description: string;
	readonly tone: 'red' | 'slate';
	readonly userIDs: readonly string[];
	readonly emptyLabel: string;
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	const Icon = props.tone === 'red' ? UserRoundX : UserRoundCheck;

	return (
		<div className="campfire-attention-group">
			<span className={cn('campfire-attention-icon', `campfire-attention-icon--${props.tone}`)} aria-hidden="true">
				<Icon className="cf:size-4" />
			</span>

			<div className="campfire-attention-copy">
				<strong className="campfire-attention-title">{props.label}</strong>
				<span className="campfire-attention-description">{props.description}</span>
			</div>

			<div className="campfire-attention-people">
				{props.userIDs.length === 0 ? (
					<span className="campfire-attention-empty">{props.emptyLabel}</span>
				) : (
					props.userIDs.map(userID => (
						<span key={userID} className={cn('campfire-attention-chip', `campfire-attention-chip--${props.tone}`)}>
							{props.labelForUserID(userID)}
						</span>
					))
				)}
			</div>
		</div>
	);
}
