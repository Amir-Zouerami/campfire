import type { ReactElement } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireDataTable, CampfireDataTableCell, CampfireDataTableRow } from '@/components/campfire/CampfireDataTable';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';

/**
 * TeamStandupsAttentionStripProps contains people status summaries for review.
 */
type TeamStandupsAttentionStripProps = {
	readonly missingUserIDs: readonly string[];
	readonly onLeaveUserIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupsAttentionStrip renders missing and on-leave people as readable lists.
 */
export function TeamStandupsAttentionStrip(props: TeamStandupsAttentionStripProps): ReactElement {
	return (
		<div className="campfire-team-review-attention-grid">
			<PeopleReviewPanel
				icon={UserRoundX}
				title="Missing"
				description="People who still need a standup follow-up."
				statusLabel="Missing"
				emptyTitle="Nobody missing"
				emptyDescription="Everyone expected has submitted or is covered by approved leave."
				userIDs={props.missingUserIDs}
				labelForUserID={props.labelForUserID}
			/>

			<PeopleReviewPanel
				icon={UserRoundCheck}
				title="On leave"
				description="People skipped from missing counts for this date."
				statusLabel="On leave"
				emptyTitle="Nobody on leave"
				emptyDescription="No approved leave covers this occurrence date."
				userIDs={props.onLeaveUserIDs}
				labelForUserID={props.labelForUserID}
			/>
		</div>
	);
}

/**
 * PeopleReviewPanel renders one readable status list.
 */
function PeopleReviewPanel(props: {
	readonly icon: typeof UserRoundCheck;
	readonly title: string;
	readonly description: string;
	readonly statusLabel: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly userIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
}): ReactElement {
	return (
		<CampfireSettingsPanel
			icon={props.icon}
			title={props.title}
			description={props.description}
			meta={<span className="campfire-team-review-count">{props.userIDs.length}</span>}
			className="campfire-team-review-panel"
		>
			{props.userIDs.length === 0 ? (
				<CampfireEmpty title={props.emptyTitle} description={props.emptyDescription} />
			) : (
				<CampfireDataTable
					label={`${props.title} people`}
					columns={['Person', 'Status']}
					columnsTemplate="minmax(0, 1fr) 6.5rem"
					className="campfire-people-review-table"
				>
					{props.userIDs.map(userID => {
						const label = props.labelForUserID(userID);

						return (
							<CampfireDataTableRow key={userID}>
								<CampfireDataTableCell>
									<CampfireBidiText title={label}>{label}</CampfireBidiText>
								</CampfireDataTableCell>
								<CampfireDataTableCell>
									<span className="campfire-team-review-status-text">{props.statusLabel}</span>
								</CampfireDataTableCell>
							</CampfireDataTableRow>
						);
					})}
				</CampfireDataTable>
			)}
		</CampfireSettingsPanel>
	);
}
