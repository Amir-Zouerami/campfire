import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { CalendarClock, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireConfirmDialog } from '@/components/campfire/CampfireConfirmDialog';
import { CampfireEmpty, CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { TFunction } from '@/i18n';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatDateTime, scheduleHasChanges, shortID } from './standup-settings.helpers';
import { standupKindLabel } from './standup-settings.i18n';
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
	readonly onDeleteSchedule: (schedule: StandupSchedule) => Promise<boolean>;
};

/**
 * StandupScheduleView identifies one dedicated schedule editor state.
 */
type StandupScheduleView = 'list' | 'new' | 'edit';

/**
 * StandupSchedulesPanel renders schedule list/create/edit as dedicated pages.
 */
export function StandupSchedulesPanel(props: StandupSchedulesPanelProps): ReactElement {
	const { t } = useI18n();
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
				deleting={props.savingID === `delete-schedule-${selectedSchedule.schedule.id}`}
				onBack={() => setView('list')}
				onDraftChange={props.onScheduleDraftChange}
				onSaveSchedule={props.onSaveSchedule}
				onDeleteSchedule={async schedule => {
					const deleted = await props.onDeleteSchedule(schedule);

					if (deleted) {
						setView('list');
						setSelectedScheduleID('');
					}

					return deleted;
				}}
			/>
		);
	}

	return (
		<div className="campfire-standup-editor-stack">
			<CampfirePageIntro
				eyebrow={t('settings.standups.schedules.library.eyebrow')}
				title={t('settings.standups.schedules.library.title')}
				description={t('settings.standups.schedules.library.description')}
				actions={(
					<Button type="button" disabled={formDisabled} onClick={() => setView('new')}>
						<Plus className="cf:size-4" />
						{t('settings.standups.actions.newSchedule')}
					</Button>
				)}
			/>

			<CampfireSurface className="campfire-standup-editor-surface">
				{props.schedulesWithDrafts.length === 0 ? (
					<CampfireEmpty icon={CalendarClock} title={t('settings.standups.schedules.empty.title')} description={t('settings.standups.schedules.empty.description')} />
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
	const { t } = useI18n();

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
					eyebrow={t('settings.standups.schedules.new.eyebrow')}
					title={t('settings.standups.schedules.new.title')}
					description={t('settings.standups.schedules.new.description')}
					backLabel={t('settings.standups.actions.backToSchedules')}
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
					<Button type="button" variant="ghost" onClick={props.onBack}>{t('common.cancel')}</Button>
					<Button type="submit" disabled={props.disabled}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Plus className="cf:size-4" />}
						{t('settings.standups.actions.createSchedule')}
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
	readonly deleting: boolean;
	readonly onBack: () => void;
	readonly onDraftChange: (scheduleID: string, patch: StandupScheduleDraftPatch) => void;
	readonly onSaveSchedule: (schedule: StandupSchedule) => Promise<void>;
	readonly onDeleteSchedule: (schedule: StandupSchedule) => Promise<boolean>;
}): ReactElement {
	const { t } = useI18n();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const changed = scheduleHasChanges(props.scheduleWithDraft.schedule, props.scheduleWithDraft.draft);
	const formDisabled = props.disabled || !props.canManageStandups;
	const mutationBusy = props.saving || props.deleting;
	const title = `${standupKindLabel(t, props.scheduleWithDraft.schedule.kind)} · ${props.scheduleWithDraft.draft.opensAt}–${props.scheduleWithDraft.draft.timeOfDay}`;

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
					eyebrow={t('settings.standups.schedule.eyebrow')}
					title={title}
					description={t('settings.standups.schedule.updatedAt', { time: formatDateTime(props.scheduleWithDraft.schedule.updatedAt) })}
					backLabel={t('settings.standups.actions.backToSchedules')}
					onBack={props.onBack}
					actions={(
						<div className="campfire-pill-row">
							<CampfireStatusPill tone={props.scheduleWithDraft.draft.enabled ? 'green' : 'slate'}>
								{props.scheduleWithDraft.draft.enabled ? t('settings.standups.status.enabled') : t('settings.standups.status.disabled')}
							</CampfireStatusPill>
							<CampfireStatusPill tone={changed ? 'ember' : 'green'}>{changed ? t('settings.standups.status.unsaved') : t('settings.standups.status.saved')}</CampfireStatusPill>
							<Button
								type="button"
								variant="destructive"
								disabled={formDisabled || mutationBusy}
								onClick={() => setDeleteDialogOpen(true)}
							>
								{props.deleting ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Trash2 className="cf:size-4" />}
								{t('settings.standups.actions.deleteSchedule')}
							</Button>
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
					<Button type="button" variant="ghost" onClick={props.onBack}>{t('common.back')}</Button>
					<Button type="submit" disabled={formDisabled || !changed || mutationBusy}>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						{t('settings.standups.actions.saveSchedule')}
					</Button>
				</div>
			</form>

			<CampfireConfirmDialog
				open={deleteDialogOpen}
				intent="danger"
				title={t('settings.standups.delete.schedule.title')}
				description={t('settings.standups.delete.schedule.description')}
				confirmLabel={t('settings.standups.actions.deleteSchedule')}
				busy={props.deleting}
				onCancel={() => setDeleteDialogOpen(false)}
				onConfirm={() => {
					void props.onDeleteSchedule(props.scheduleWithDraft.schedule).then(deleted => {
						if (deleted) {
							setDeleteDialogOpen(false);
						}
					});
				}}
			>
				<p className="campfire-destructive-inline-note">
					{t('settings.standups.delete.schedule.note')}
				</p>
			</CampfireConfirmDialog>
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
	const { t } = useI18n();
	const templateName = scheduleTemplateName(props.schedule.templateId, props.templates, t);
	const changed = scheduleHasChanges(props.schedule, props.draft);

	return (
		<button type="button" className="campfire-standup-template-row" onClick={props.onOpen}>
			<span className="campfire-standup-template-row-main">
				<CampfireBidiText className="campfire-standup-template-row-title">
					{props.draft.opensAt}–{props.draft.timeOfDay} · {templateName}
				</CampfireBidiText>
				<span className="campfire-standup-template-row-meta">
					{standupKindLabel(t, props.schedule.kind)} · {t('settings.standups.schedule.updatedAt', { time: formatDateTime(props.schedule.updatedAt) })}
				</span>
			</span>

			<span className="campfire-standup-question-row-badges" aria-label={t('settings.standups.aria.scheduleStatus')}>
				<span>{props.draft.enabled ? t('settings.standups.status.enabled') : t('settings.standups.status.disabled')}</span>
				{changed && <span>{t('settings.standups.status.unsaved')}</span>}
			</span>

			<span className="campfire-standup-template-row-action">{t('settings.standups.actions.open')}</span>
		</button>
	);
}

/**
 * scheduleTemplateName returns a readable template label for a schedule.
 */
function scheduleTemplateName(templateID: string, templates: readonly StandupTemplate[], t: TFunction): string {
	const template = templates.find(item => item.id === templateID);

	if (template === undefined) {
		return t('settings.standups.schedule.missingTemplate', { id: shortID(templateID) });
	}

	return template.name;
}
