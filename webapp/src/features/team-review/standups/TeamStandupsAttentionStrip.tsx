import type { ReactElement } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * TeamStandupsAttentionStripProps contains people status summaries for review.
 */
type TeamStandupsAttentionStripProps = {
	readonly missingUserIDs: readonly string[];
	readonly onLeaveUserIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * PeopleBucketTone controls the review table status styling.
 */
type PeopleBucketTone = 'red' | 'slate';

/**
 * PeopleReviewBucketProps contains one people table for a review status group.
 */
type PeopleReviewBucketProps = {
	readonly title: string;
	readonly description: string;
	readonly statusLabel: string;
	readonly note: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly tone: PeopleBucketTone;
	readonly userIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupsAttentionStrip renders missing and on-leave people as scalable tables.
 */
export function TeamStandupsAttentionStrip(props: TeamStandupsAttentionStripProps): ReactElement {
	return (
		<section className="campfire-people-review" aria-labelledby="campfire-people-review-title">
			<header className="campfire-people-review-header">
				<div>
					<p className="campfire-people-review-eyebrow">People review</p>
					<h3 id="campfire-people-review-title">Missing and leave status</h3>
				</div>
			</header>

			<div className="campfire-people-review-grid">
				<PeopleReviewBucket
					title="Missing"
					description="People who still need a standup follow-up."
					statusLabel="Missing"
					note="Needs follow-up"
					emptyTitle="Nobody missing"
					emptyDescription="Every expected person has submitted or is excused."
					tone="red"
					userIDs={props.missingUserIDs}
					labelForUserID={props.labelForUserID}
				/>

				<PeopleReviewBucket
					title="On leave"
					description="People skipped from missing counts because leave covers this date."
					statusLabel="On leave"
					note="Skipped from missing"
					emptyTitle="Nobody on leave"
					emptyDescription="No approved leave is covering this occurrence date."
					tone="slate"
					userIDs={props.onLeaveUserIDs}
					labelForUserID={props.labelForUserID}
				/>
			</div>
		</section>
	);
}

/**
 * PeopleReviewBucket renders one scalable user table for a review status.
 */
function PeopleReviewBucket(props: PeopleReviewBucketProps): ReactElement {
	const Icon = props.tone === 'red' ? UserRoundX : UserRoundCheck;

	return (
		<section className={cn('campfire-people-review-bucket', `campfire-people-review-bucket--${props.tone}`)}>
			<header className="campfire-people-review-bucket-header">
				<span className={cn('campfire-people-review-icon', `campfire-people-review-icon--${props.tone}`)} aria-hidden="true">
					<Icon className="cf:size-5" />
				</span>
				<div>
					<h4>{props.title}</h4>
					<p>{props.description}</p>
				</div>
				<strong>{props.userIDs.length}</strong>
			</header>

			{props.userIDs.length === 0 ? (
				<div className="campfire-people-review-empty">
					<strong>{props.emptyTitle}</strong>
					<span>{props.emptyDescription}</span>
				</div>
			) : (
				<div className="campfire-people-review-table" role="table" aria-label={`${props.title} users`}>
					<div className="campfire-people-review-row campfire-people-review-row--head" role="row">
						<span role="columnheader">Person</span>
						<span role="columnheader">Status</span>
						<span role="columnheader">Review note</span>
					</div>

					<div className="campfire-people-review-body">
						{props.userIDs.map(userID => (
							<div key={userID} className="campfire-people-review-row" role="row">
								<strong role="cell">{props.labelForUserID(userID)}</strong>
								<span role="cell" className={cn('campfire-people-review-status', `campfire-people-review-status--${props.tone}`)}>
									{props.statusLabel}
								</span>
								<span role="cell">{props.note}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
}
