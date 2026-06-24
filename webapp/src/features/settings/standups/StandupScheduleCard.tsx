import type { ReactElement } from 'react';
import { Info, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { StandupSchedule, StandupTemplate } from '@/types/domain';

import { formatDateTime, formatLabel, scheduleHasChanges, shortID } from './standup-settings.helpers';
import type { StandupScheduleDraft, StandupScheduleDraftPatch } from './standup-settings.types';
import { StandupScheduleFields } from './StandupScheduleFields';
import { CampfireStatusPill } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireNotice } from '@/components/campfire/CampfireNotice';
import { useI18n } from '@/i18n';

/**
 * StandupScheduleCardProps contains one persisted schedule and its draft.
 */
type StandupScheduleCardProps = {
	readonly schedule: StandupSchedule;
	readonly templates: readonly StandupTemplate[];
	readonly draft: StandupScheduleDraft;
	readonly disabled: boolean;
	readonly canManageStandups: boolean;
	readonly saving: boolean;
	readonly onDraftChange: (scheduleID: string, patch: StandupScheduleDraftPatch) => void;
	readonly onSave: (schedule: StandupSchedule) => Promise<void>;
};

/**
 * StandupScheduleCard renders one editable schedule row.
 */
export function StandupScheduleCard(props: StandupScheduleCardProps): ReactElement {
	const { t } = useI18n();
	const changed = scheduleHasChanges(props.schedule, props.draft);
	const formDisabled = props.disabled || !props.canManageStandups;
	const templateName = scheduleTemplateName(props.schedule.templateId, props.templates);

	return (
		<article className="campfire-standup-schedule-card">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-sm cf:font-semibold cf:uppercase cf:leading-none cf:tracking-[0.18em] cf:text-amber-100">
						{t('settings.standups.schedule.kindLabel', { kind: formatLabel(props.schedule.kind) })}
					</p>

					<h3 className="cf:m-0 cf:mt-3 cf:text-xl cf:font-semibold cf:leading-tight cf:tracking-[-0.03em] cf:text-foreground">
						{props.schedule.opensAt}–{props.schedule.timeOfDay} · {templateName}
					</h3>

					<p className="cf:m-0 cf:mt-2 cf:text-xs cf:font-bold cf:text-muted-foreground">
						{t('settings.standups.schedule.updatedAt', { time: formatDateTime(props.schedule.updatedAt) })}
					</p>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<CampfireStatusPill tone={props.draft.enabled ? 'green' : 'slate'}>
						{props.draft.enabled ? t('common.enabled') : t('common.disabled')}
					</CampfireStatusPill>
					<CampfireStatusPill tone={changed ? 'ember' : 'green'}>
						{changed ? t('common.unsavedChanges') : t('common.saved')}
					</CampfireStatusPill>
				</div>
			</div>

			<StandupScheduleFields
				idPrefix={`campfire-schedule-${props.schedule.id}`}
				templates={props.templates}
				draft={props.draft}
				disabled={formDisabled}
				onChange={patch => props.onDraftChange(props.schedule.id, patch)}
			/>

			<CampfireNotice
				icon={Info}
				title={t('settings.standups.schedule.independentNotice.title')}
				description={t('settings.standups.schedule.independentNotice.description')}
				action={
					<Button
						type="button"
						disabled={formDisabled || !changed}
						onClick={() => void props.onSave(props.schedule)}
					>
						{props.saving ? <Loader2 className="cf:size-4 cf:animate-spin" /> : <Save className="cf:size-4" />}
						{t('settings.standups.schedule.save')}
					</Button>
				}
			/>
		</article>
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

	const kindLabel = formatLabel(template.kind);

	return `${template.name} (${kindLabel})`;
}
