import type { ReactElement } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { GlobalSkipDate } from '@/types/domain';

import { formatDateTime, globalOffDayIsPast } from './global-off-days.helpers';
import { CampfireEmpty, CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * GlobalOffDaysListPanelProps contains global skip-date list state.
 */
type GlobalOffDaysListPanelProps = {
	readonly skipDates: readonly GlobalSkipDate[];
	readonly disabled: boolean;
	readonly isSystemAdmin: boolean;
	readonly deletingID: string;
	readonly onDelete: (skipDateID: string) => Promise<void>;
};

/**
 * GlobalOffDaysListPanel renders global off-days.
 */
export function GlobalOffDaysListPanel(props: GlobalOffDaysListPanelProps): ReactElement {
	return (
		<section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div>
				<p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Global skip dates
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
					Company-wide holidays
				</h3>
			</div>

			{props.skipDates.length === 0 ? (
				<CampfireEmpty
					icon={CalendarX2}
					title="No global off-days"
					description="System admins can add dates that suppress standup automation everywhere."
				/>
			) : (
				<div className="cf:grid cf:gap-3">
					{props.skipDates.map(skipDate => (
						<GlobalOffDayRow
							key={skipDate.id}
							skipDate={skipDate}
							disabled={props.disabled || !props.isSystemAdmin}
							deleting={props.deletingID === skipDate.id}
							onDelete={() => props.onDelete(skipDate.id)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

/**
 * GlobalOffDayRow renders one global skip date.
 */
function GlobalOffDayRow(props: {
	readonly skipDate: GlobalSkipDate;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly onDelete: () => Promise<void>;
}): ReactElement {
	const isPast = globalOffDayIsPast(props.skipDate);

	return (
		<article className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:sm:grid-cols-[1fr_auto]">
			<div className="cf:min-w-0">
				<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
					<h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
						{props.skipDate.label}
					</h4>
					<CampfireStatusPill tone={isPast ? 'slate' : 'ember'}>
						{isPast ? 'Past' : 'Upcoming'}
					</CampfireStatusPill>
				</div>

				<p className="cf:mt-2 cf:text-sm cf:font-bold cf:text-slate-300">{props.skipDate.date}</p>
				<p className="cf:mt-1 cf:text-xs cf:font-bold cf:text-slate-500">
					Created {formatDateTime(props.skipDate.createdAt)}
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
