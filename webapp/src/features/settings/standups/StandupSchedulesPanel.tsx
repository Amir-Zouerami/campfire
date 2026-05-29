import type { ReactElement } from 'react';
import { CalendarClock, Loader2, Plus } from 'lucide-react';

import { CampfireStatusPill, CampfireSurface, CampfireWorkflowNote } from '@/components/campfire/CampfireLayoutPrimitives';
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
		<div className="campfire-standup-schedules-workflow">
			<CampfireSurface className="campfire-standup-schedules-create-surface">
				<div className="campfire-surface-header campfire-surface-header--with-action">
					<div>
						<p className="campfire-surface-eyebrow">Schedules</p>
						<h3 className="campfire-surface-title">When reports post</h3>
						<p className="campfire-surface-description">
							Create one report schedule, attach a template, and set the local report posting time.
						</p>
					</div>
					<CampfireStatusPill tone="ember">{props.schedulesWithDrafts.length} schedules</CampfireStatusPill>
				</div>

				<CampfireWorkflowNote
					icon={CalendarClock}
					title="Daily and weekly behavior stays explicit."
					description="Report time is when the summary posts. Reminder offsets run during the hour before this time."
				/>

				<form
					className="campfire-standup-schedule-create-form"
					onSubmit={event => {
						event.preventDefault();
						void props.onCreateSchedule();
					}}
				>
					<StandupScheduleFields
						idPrefix="campfire-new-standup-schedule"
						templates={props.templates}
						draft={props.newSchedule}
						disabled={formDisabled}
						onChange={props.onNewScheduleChange}
					/>

					<div className="campfire-form-actions">
						<Button type="submit" disabled={formDisabled}>
							{props.savingID === 'new-schedule' ? (
								<Loader2 className="cf:size-4 cf:animate-spin" />
							) : (
								<Plus className="cf:size-4" />
							)}
							Create report schedule
						</Button>
					</div>
				</form>
			</CampfireSurface>

			<CampfireSurface className="campfire-standup-schedules-list-surface">
				<div className="campfire-surface-header campfire-surface-header--with-action">
					<div>
						<p className="campfire-surface-eyebrow">Saved runs</p>
						<h3 className="campfire-surface-title">Existing schedules</h3>
						<p className="campfire-surface-description">
							Edit enabled state, cadence, report time, and skip behavior in-place.
						</p>
					</div>
					<CampfireStatusPill tone="slate">{props.schedulesWithDrafts.length}</CampfireStatusPill>
				</div>

				{props.schedulesWithDrafts.length === 0 && (
					<div className="campfire-flat-empty-state">
						<span className="campfire-flat-empty-icon" aria-hidden="true">
							<CalendarClock className="cf:size-5" />
						</span>
						<div>
							<h4>No schedules yet</h4>
							<p>Create at least one schedule after a template exists.</p>
						</div>
					</div>
				)}

				{props.schedulesWithDrafts.length > 0 && (
					<div className="campfire-standup-schedule-list">
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
			</CampfireSurface>
		</div>
	);
}
