import type { ReactElement } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { WorkspaceOffDay } from '@/types/domain';

import { formatDateTime, workspaceOffDayIsPast } from './working-calendar.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

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
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Workspace off-days
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Holidays and skip dates
				</h3>
			</div>

			{props.offDays.length === 0 ? (
				<CampfireEmpty
					icon={CalendarX2}
					title="No workspace off-days"
					description="Add holidays or skip dates that should suppress standup automation for this workspace."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.offDays.map(offDay => (
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
		</section>
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
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:sm:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						{props.offDay.label}
					</h4>

					<CampfireStatusPill tone={isPast ? 'slate' : 'ember'}>
						{isPast ? 'Past' : 'Upcoming'}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">{props.offDay.date}</p>
				<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
					Created {formatDateTime(props.offDay.createdAt)}
				</p>
			</div>

			<div className="cf:flex cf:items-start cf:justify-end">
				<Button
					type="button"
					variant="destructive"
					disabled={props.disabled}
					onClick={() => void props.onDelete()}
				>
					<Trash2 className="cf:size-4" />
					{props.deleting ? 'Deleting…' : 'Delete'}
				</Button>
			</div>
		</article>
	);
}
