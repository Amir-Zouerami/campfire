import type { ReactElement } from 'react';
import { UserRoundCheck, UserRoundX } from 'lucide-react';

import { CampfireEmpty } from '@/app/campfire-ui';

import { userChipClassName } from './team-standups.helpers';

/**
 * TeamStandupsPeoplePanelProps contains missing/on-leave user IDs.
 */
type TeamStandupsPeoplePanelProps = {
	readonly title: string;
	readonly description: string;
	readonly userIDs: readonly string[];
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly tone: 'green' | 'red' | 'slate';
	readonly labelForUserID: (userID: string) => string;
};

/**
 * TeamStandupsPeoplePanel renders compact missing, submitted, or on-leave user chips.
 */
export function TeamStandupsPeoplePanel(props: TeamStandupsPeoplePanelProps): ReactElement {
	const EmptyIcon = props.tone === 'red' ? UserRoundX : UserRoundCheck;

	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					{props.title}
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					{props.description}
				</h3>
			</div>

			{props.userIDs.length === 0 ? (
				<CampfireEmpty icon={EmptyIcon} title={props.emptyTitle} description={props.emptyDescription} />
			) : (
				<div className="cf:flex cf:flex-wrap cf:gap-2">
					{props.userIDs.map(userID => (
						<span key={userID} className={userChipClassName(props.tone)} title={userID}>
							{props.labelForUserID(userID)}
						</span>
					))}
				</div>
			)}
		</section>
	);
}
