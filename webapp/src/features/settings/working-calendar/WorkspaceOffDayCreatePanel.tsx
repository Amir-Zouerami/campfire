import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireResponsiveInput } from '@/components/campfire/CampfireResponsiveInput';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';

import type { WorkspaceOffDayDraft, WorkspaceOffDayDraftPatch } from './working-calendar.types';

/**
 * WorkspaceOffDayCreatePanelProps contains create off-day form state.
 */
type WorkspaceOffDayCreatePanelProps = {
	readonly draft: WorkspaceOffDayDraft;
	readonly disabled: boolean;
	readonly canManageCalendar: boolean;
	readonly timezone: string;
	readonly onChange: (patch: WorkspaceOffDayDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * WorkspaceOffDayCreatePanel renders the add workspace off-day form.
 */
export function WorkspaceOffDayCreatePanel(props: WorkspaceOffDayCreatePanelProps): ReactElement {
	const { t } = useI18n();

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<CampfireSettingsPanel
			eyebrow={t('settings.workingCalendar.offDayCreate.eyebrow')}
			title={t('settings.workingCalendar.offDayCreate.title')}
			description={t('settings.workingCalendar.offDayCreate.description')}
		>
			<form className="campfire-settings-form" onSubmit={handleSubmit}>
				<div className="campfire-settings-control-grid campfire-settings-control-grid--date-label">
					<CampfireField id="campfire-workspace-off-day-date" label={t('settings.workingCalendar.offDayCreate.date')}>
						<CampfireDateInput
							id="campfire-workspace-off-day-date"
							disabled={props.disabled || !props.canManageCalendar}
							timezone={props.timezone}
							value={props.draft.date}
							onValueChange={value => props.onChange({ date: value })}
						/>
					</CampfireField>

					<CampfireField id="campfire-workspace-off-day-label" label={t('settings.workingCalendar.offDayCreate.label')}>
						<CampfireResponsiveInput
							id="campfire-workspace-off-day-label"
							disabled={props.disabled || !props.canManageCalendar}
							placeholder={t('settings.workingCalendar.offDayCreate.placeholder')}
							value={props.draft.label}
							onValueChange={value => props.onChange({ label: value })}
						/>
					</CampfireField>
				</div>

				<div className="campfire-settings-form-actions">
					<CampfireControlButton type="submit" disabled={props.disabled || !props.canManageCalendar}>
						<Plus className="cf:size-4" />
						{t('settings.workingCalendar.offDayCreate.action')}
					</CampfireControlButton>
				</div>
			</form>
		</CampfireSettingsPanel>
	);
}
