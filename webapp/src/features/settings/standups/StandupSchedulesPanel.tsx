import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarClock, Loader2, Plus, Save } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { Button } from '@/components/ui/button';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatDateTime, formatLabel, scheduleHasChanges, shortID } from './standup-settings.helpers';
import type {
	StandupScheduleDraft,
	StandupScheduleDraftPatch,
	StandupScheduleWithDraft,
} from './standup-settings.types';
import { StandupFormsPageHeader } from './StandupFormsPageHeader';
import { StandupScheduleFields } from './StandupScheduleFields';

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
 * StandupScheduleView identifies one dedicated schedule editor state.
 */
type StandupScheduleView = 'list' | 'new' | 'edit';

/**
 * StandupSchedulesPanel renders schedule list/create/edit as dedicated pages.
 */
export function StandupSchedulesPanel(props: StandupSchedulesPanelProps): ReactElement {
	const [view, setView] = useState<StandupScheduleView>('list');
	const [selectedScheduleID, setSelectedScheduleID] = useState('');
	const selectedSchedule = useMemo(
		() => props.schedulesWithDrafts.find(pair => pair.schedule.id === selectedScheduleID),
		[props.schedulesWithDrafts, selectedScheduleID],
	);
	const formDisabled = props.disabled || !props.canManageStandups || props.templates.length === 0;

	useEffect(() => {
		if (selectedScheduleID !== '' && selectedSchedule === undefined) {
			setSelectedScheduleID('');
			setView('list');
		}
	}, [selectedSchedule, selectedScheduleID]);

	if (view === 'new') {
		return (
			<NewSchedulePage
				templates={props.templates}
				draft={props.newSchedule}
				disabled={formDisabled}
				saving={props.savingID === 'new-schedule'}
				onBack={() => setView('list')}
				onDraftChange={props.onNewScheduleChange}
				onCreateSchedule={props.onCreateSchedule}
			/>
		);
	}

	if (view === 'edit' && selectedSchedule !== undefined) {
		return (
			<EditSchedulePage
				scheduleWithDraft={selectedSchedule}
				templates={props.templates}
				disabled={props.disabled}
				canManageStandups={props.canManageStandups}
				saving={props.savingID === selectedSchedule.schedule.id}
				onBack={() => setView('list')}
				onDraftChange={props.onScheduleDraftChange}
				onSaveSchedule={props.onSaveSchedule}
			/>
		);
	}

	return (
		<div className="campfire-standup-editor-stack">
			<CampfirePageIntro
				eyebrow="Schedules"
				title="Choose a standup window"
				description="Open one schedule at a time. Each window controls when submissions open, close, and post the report."
				actions={(
					<Button type="button" disabled={formDisabled} onClick={() => setView('new')}>
						<Plus className="cf:size-4" />
						New schedule
					</Button>
				)}
			/>

			<CampfireSurface className="campfire-standup-editor-surface">
				{props.schedulesWithDrafts.length === 0 ? (
					<CampfireEmpty icon={CalendarClock} title="No schedules yet" description="Create at least one schedule after a template exists." />
				) : (
					<div className="campfire-standup-template-directory" role="list">
						{props.schedulesWithDrafts.map(pair => (
							<ScheduleDirectoryRow
								key={pair.schedule.id}
								schedule={pair.schedule}
								draft={pair.draft}
								templates={props.templates}
								onOpen={() => {
									setSelectedScheduleID(pair.schedule.id);
									setView('edit');
								}}
							/>
						))}
					</div>
				)}
			</CampfireSurface>
		</div>
	);
}

/**
 * NewSchedulePage renders a dedicated schedule creation page.
 */
function NewSchedulePage(props: {
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupScheduleDraft;
	readonly disabled: boolean;
	readonly saving: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (patch: StandupScheduleDraftPatch) => void;
	readonly onCreateSchedule: () => Promise<void>;
}): ReactElement {
	return (
		<CampfireSurface className="campfire-standup-editor-surface campfire-standup-editor-surface--hero">
			<form
				className="campfire-standup-editor-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onCreateSchedule();
				}}
			>
				<StandupFormsPageHeader
					eyebrow="New schedule"
					title="Create a standup window"
					description="Set the open time, close time, cadence, and skip rules on a full page."
					backLabel="Back to schedules"
					onBack={props.onBack}
				/>

				<StandupScheduleFields
					idPrefix="campfire-new-standup-schedule"
					templates={props.templates}
					draft={props.draft}
					disabled={props.disabled}
					onChange={props.onDraftChange}
				/>

				<div className="campfire-form-actions campfire-form-actions--split">
					<Button type="button" variant="ghost" onClick={props.onBack}>Cancel</Button>
					<Button type="submit" disabled={props.disabled}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
						Create schedule
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}

/**
 * EditSchedulePage renders one persisted schedule on a dedicated page.
 */
function EditSchedulePage(props: {
	readonly scheduleWithDraft: StandupScheduleWithDraft;
	readonly templates: readonly StandupTemplate[];
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly saving: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (scheduleID: string, patch: StandupScheduleDraftPatch) => void;
	readonly onSaveSchedule: (schedule: StandupSchedule) => Promise<void>;
}): ReactElement {
	const changed = scheduleHasChanges(props.scheduleWithDraft.schedule, props.scheduleWithDraft.draft);
	const formDisabled = props.disabled || !props.canManageStandups;
	const title = `${formatLabel(props.scheduleWithDraft.schedule.kind)} · ${props.scheduleWithDraft.draft.opensAt}–${props.scheduleWithDraft.draft.timeOfDay}`;

	return (
		<CampfireSurface className="campfire-standup-editor-surface campfire-standup-editor-surface--hero">
			<form
				className="campfire-standup-editor-form"
				onSubmit={event => {
					event.preventDefault();
					void props.onSaveSchedule(props.scheduleWithDraft.schedule);
				}}
			>
				<StandupFormsPageHeader
					eyebrow="Schedule"
					title={title}
					description={`Last updated ${formatDateTime(props.scheduleWithDraft.schedule.updatedAt)}.`}
					backLabel="Back to schedules"
					onBack={props.onBack}
					actions={(
						<div className="campfire-pill-row">
							<CampfireStatusPill tone={props.scheduleWithDraft.draft.enabled ? 'green' : 'slate'}>
								{props.scheduleWithDraft.draft.enabled ? 'Enabled' : 'Disabled'}
							</CampfireStatusPill>
							<CampfireStatusPill tone={changed ? 'ember' : 'green'}>{changed ? 'Unsaved' : 'Saved'}</CampfireStatusPill>
						</div>
					)}
				/>

				<StandupScheduleFields
					idPrefix={`campfire-schedule-${props.scheduleWithDraft.schedule.id}`}
					templates={props.templates}
					draft={props.scheduleWithDraft.draft}
					disabled={formDisabled}
					onChange={patch => props.onDraftChange(props.scheduleWithDraft.schedule.id, patch)}
				/>

				<div className="campfire-form-actions campfire-form-actions--split">
					<Button type="button" variant="ghost" onClick={props.onBack}>Back</Button>
					<Button type="submit" disabled={formDisabled || !changed}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						Save schedule
					</Button>
				</div>
			</form>
		</CampfireSurface>
	);
}

/**
 * ScheduleDirectoryRow renders one schedule in the schedule directory.
 */
function ScheduleDirectoryRow(props: {
	readonly schedule: StandupSchedule;
	readonly draft: StandupScheduleDraft;
	readonly templates: readonly StandupTemplate[];
	readonly onOpen: () => void;
}): ReactElement {
	const templateName = scheduleTemplateName(props.schedule.templateId, props.templates);
	const changed = scheduleHasChanges(props.schedule, props.draft);

	return (
		<button type="button" className="campfire-standup-template-row" onClick={props.onOpen}>
			<span className="campfire-standup-template-row-main">
				<CampfireBidiText className="campfire-standup-template-row-title">
					{props.draft.opensAt}–{props.draft.timeOfDay} · {templateName}
				</CampfireBidiText>
				<span className="campfire-standup-template-row-meta">
					{formatLabel(props.schedule.kind)} · updated {formatDateTime(props.schedule.updatedAt)}
				</span>
			</span>

			<span className="campfire-standup-question-row-badges" aria-label="Schedule status">
				<span>{props.draft.enabled ? 'Enabled' : 'Disabled'}</span>
				{changed && <span>Unsaved</span>}
			</span>

			<span className="campfire-standup-template-row-action">Open</span>
		</button>
	);
}

/**
 * scheduleTemplateName returns a readable template label for a schedule.
 */
function scheduleTemplateName(templateID: string, templates: readonly StandupTemplate[]): string {
	const template = templates.find(item => item.id === templateID);

	if (template === undefined) {
		return `Missing template ${shortID(templateID)}`;
	}

	return template.name;
}
