import type { ReactElement } from 'react';
import { CalendarClock, Loader2, Plus } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import type {
	StandupScheduleDraft,
	StandupScheduleDraftPatch,
	StandupScheduleWithDraft,
} from './standup-settings.types';
import { StandupScheduleFields } from './StandupScheduleFields';
import { StandupScheduleCard } from './StandupScheduleCard';

/**
 * StandupSchedulesPanelProps contains standup schedule settings data and actions.
 */
type StandupSchedulesPanelProps = {
	readonly templates: readonly StandupTemplate[];
	readonly schedulesWithDrafts: readonly StandupScheduleWithDraft[];
	readonly newSchedule: StandupScheduleDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly savingID: string;
	readonly onNewScheduleChange: (patch: StandupScheduleDraftPatch) => void;
	readonly onScheduleDraftChange: (scheduleID: string, patch: StandupScheduleDraftPatch) => void;
	readonly onCreateSchedule: () => Promise<void>;
	readonly onSaveSchedule: (schedule: StandupSchedule) => Promise<void>;
};

/**
 * StandupSchedulesPanel renders schedule creation and existing schedule editing.
 */
export function StandupSchedulesPanel(props: StandupSchedulesPanelProps): ReactElement {
	const formDisabled = props.disabled || !props.canManageStandups || props.templates.length === 0;

	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Schedules"
				title="When Campfire asks"
				description="Keep the schedule layer calm: create a run, attach a template, and set its local time."
				icon={CalendarClock}
				action={
					<CampfireStatusPill tone="ember">{props.schedulesWithDrafts.length} schedules</CampfireStatusPill>
				}
			/>

			<CampfireCardBody className="cf:grid cf:gap-5">
				<form
					className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-5"
					onSubmit={event => {
						event.preventDefault();
						void props.onCreateSchedule();
					}}
				>
					<div className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-3">
						<div>
							<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">Create schedule</h3>
							<p className="cf:m-0 cf:mt-1 cf:text-sm cf:font-semibold cf:text-muted-foreground">
								New daily, weekly, or custom run for an existing template.
							</p>
						</div>
						<CampfireStatusPill tone="ember">New</CampfireStatusPill>
					</div>

					<StandupScheduleFields
						idPrefix="campfire-new-standup-schedule"
						templates={props.templates}
						draft={props.newSchedule}
						disabled={formDisabled}
						onChange={props.onNewScheduleChange}
					/>

					<Button type="submit" disabled={formDisabled}>
						{props.savingID === 'new-schedule' ? (
							<Loader2 className="cf:size-4 cf:animate-spin" />
						) : (
							<Plus className="cf:size-4" />
						)}
						Create schedule
					</Button>
				</form>

				{props.schedulesWithDrafts.length === 0 && (
					<CampfireEmpty
						icon={CalendarClock}
						title="No schedules yet"
						description="Create at least one schedule after a template exists."
					/>
				)}

				{props.schedulesWithDrafts.length > 0 && (
					<div className="cf:grid cf:gap-4">
						{props.schedulesWithDrafts.map(pair => (
							<StandupScheduleCard
								key={pair.schedule.id}
								schedule={pair.schedule}
								templates={props.templates}
								draft={pair.draft}
								disabled={props.disabled}
								canManageStandups={props.canManageStandups}
								saving={props.savingID === pair.schedule.id}
								onDraftChange={props.onScheduleDraftChange}
								onSave={props.onSaveSchedule}
							/>
						))}
					</div>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}
