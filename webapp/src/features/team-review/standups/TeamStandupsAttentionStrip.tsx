import type { ReactElement } from 'react';
import { UserRoundCheck, UserRoundMinus, UserRoundX } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireDataTable, CampfireDataTableCell, CampfireDataTableRow } from '@/components/campfire/CampfireDataTable';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';

/**
 * TeamStandupsAttentionStripProps contains people status summaries for review.
 */
type TeamStandupsAttentionStripProps = {
	readonly missingUserIDs: readonly string[];
	readonly onLeaveUserIDs: readonly string[];
	readonly excludedUserIDs: readonly string[];
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupsAttentionStrip renders missing, on-leave, and excluded people as readable lists.
 */
export function TeamStandupsAttentionStrip(props: TeamStandupsAttentionStripProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-team-review-attention-grid">
			<PeopleReviewPanel
				icon={UserRoundX}
				title={t('teamReview.standups.people.missing.title')}
				description={t('teamReview.standups.people.missing.description')}
				statusLabel={t('teamReview.standups.people.missing.status')}
				emptyTitle={t('teamReview.standups.people.missing.empty.title')}
				emptyDescription={t('teamReview.standups.people.missing.empty.description')}
				userIDs={props.missingUserIDs}
				labelForUserID={props.labelForUserID}
			/>

			<PeopleReviewPanel
				icon={UserRoundCheck}
				title={t('teamReview.standups.people.onLeave.title')}
				description={t('teamReview.standups.people.onLeave.description')}
				statusLabel={t('teamReview.standups.people.onLeave.status')}
				emptyTitle={t('teamReview.standups.people.onLeave.empty.title')}
				emptyDescription={t('teamReview.standups.people.onLeave.empty.description')}
				userIDs={props.onLeaveUserIDs}
				labelForUserID={props.labelForUserID}
			/>

			<PeopleReviewPanel
				icon={UserRoundMinus}
				title={t('teamReview.standups.people.excluded.title')}
				description={t('teamReview.standups.people.excluded.description')}
				statusLabel={t('teamReview.standups.people.excluded.status')}
				emptyTitle={t('teamReview.standups.people.excluded.empty.title')}
				emptyDescription={t('teamReview.standups.people.excluded.empty.description')}
				userIDs={props.excludedUserIDs}
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
	const { t } = useI18n();

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
					label={t('teamReview.standups.people.tableLabel', { title: props.title })}
					columns={[t('teamReview.standups.people.personColumn'), t('teamReview.standups.people.statusColumn')]}
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
