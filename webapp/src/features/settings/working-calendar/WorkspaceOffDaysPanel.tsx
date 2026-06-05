import type { ReactElement } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';

import { CampfireBidiText, CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { Button } from '@/components/ui/button';
import { sortByNewest } from '@/lib/sort';
import type { WorkspaceOffDay } from '@/types/domain';

import { formatDateTime, workspaceOffDayIsPast } from './working-calendar.helpers';

/**
 * WorkspaceOffDaysPanelProps contains workspace off-day list state.
 */
type WorkspaceOffDaysPanelProps = {
	readonly offDays: readonly WorkspaceOffDay[];
	readonly disabled: boolean;
	readonly canManageCalendar: boolean;
	readonly deletingOffDayID: string;
	readonly onDelete: (offDayID: string) => Promise<void>;
};

/**
 * WorkspaceOffDaysPanel renders workspace off-days.
 */
export function WorkspaceOffDaysPanel(props: WorkspaceOffDaysPanelProps): ReactElement {
	const offDays = sortByNewest(props.offDays, offDay => offDay.date || offDay.createdAt);

	return (
		<CampfireSettingsPanel
			eyebrow="Workspace off-days"
			title="Holidays and skip dates"
			description="Newest dates appear first so recent changes are easy to review."
		>
			{offDays.length === 0 ? (
				<CampfireEmpty
					icon={CalendarX2}
					title="No workspace off-days"
					description="Add holidays or skip dates that should suppress standup automation for this workspace."
				/>
			) : (
				<div className="campfire-settings-flat-list">
					{offDays.map(offDay => (
						<WorkspaceOffDayRow
							key={offDay.id}
							offDay={offDay}
							disabled={props.disabled || !props.canManageCalendar}
							deleting={props.deletingOffDayID === offDay.id}
							onDelete={() => props.onDelete(offDay.id)}
						/>
					))}
				</div>
			)}
		</CampfireSettingsPanel>
	);
}

/**
 * WorkspaceOffDayRow renders one workspace off-day row.
 */
function WorkspaceOffDayRow(props: {
	readonly offDay: WorkspaceOffDay;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly onDelete: () => Promise<void>;
}): ReactElement {
	const isPast = workspaceOffDayIsPast(props.offDay);

	return (
		<article className="campfire-settings-flat-row">
			<div className="campfire-settings-flat-row-main">
				<strong><CampfireEllipsisText value={props.offDay.label} /></strong>
				<p>
					<CampfireBidiText>{props.offDay.date}</CampfireBidiText>
					<span> · </span>
					<span>{isPast ? 'Past date' : 'Upcoming'}</span>
					<span> · </span>
					<span>Created {formatDateTime(props.offDay.createdAt)}</span>
				</p>
			</div>

			<Button type="button" variant="destructive" disabled={props.disabled} onClick={() => void props.onDelete()}>
				<Trash2 className="cf:size-4" />
				{props.deleting ? 'Deleting…' : 'Delete'}
			</Button>
		</article>
	);
}
