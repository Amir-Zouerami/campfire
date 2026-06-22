import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireResponsiveInput } from '@/components/campfire/CampfireResponsiveInput';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { useI18n } from '@/i18n';

import type { GlobalOffDayDraft, GlobalOffDayDraftPatch } from './global-off-days.types';

/**
 * GlobalOffDayCreatePanelProps contains create global off-day form state.
 */
type GlobalOffDayCreatePanelProps = {
	readonly draft: GlobalOffDayDraft;
	readonly disabled: boolean;
	readonly isSystemAdmin: boolean;
	readonly onChange: (patch: GlobalOffDayDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * GlobalOffDayCreatePanel renders the create global off-day form.
 */
export function GlobalOffDayCreatePanel(props: GlobalOffDayCreatePanelProps): ReactElement {
	const { t } = useI18n();

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<CampfireSettingsPanel
			eyebrow={t('settings.globalOffDays.create.eyebrow')}
			title={t('settings.globalOffDays.create.title')}
			description={t('settings.globalOffDays.create.description')}
		>
			<form className="campfire-settings-form" onSubmit={handleSubmit}>
				<div className="campfire-settings-control-grid campfire-settings-control-grid--date-label">
					<CampfireField id="campfire-global-off-day-date" label={t('settings.globalOffDays.create.date')}>
						<CampfireDateInput
							id="campfire-global-off-day-date"
							disabled={props.disabled || !props.isSystemAdmin}
							value={props.draft.date}
							onValueChange={value => props.onChange({ date: value })}
						/>
					</CampfireField>

					<CampfireField id="campfire-global-off-day-label" label={t('settings.globalOffDays.create.label')}>
						<CampfireResponsiveInput
							id="campfire-global-off-day-label"
							disabled={props.disabled || !props.isSystemAdmin}
							placeholder={t('settings.globalOffDays.create.placeholder')}
							value={props.draft.label}
							onValueChange={value => props.onChange({ label: value })}
						/>
					</CampfireField>
				</div>

				<div className="campfire-settings-form-actions">
					<CampfireControlButton type="submit" disabled={props.disabled || !props.isSystemAdmin}>
						<Plus className="cf:size-4" />
						{t('settings.globalOffDays.create.action')}
					</CampfireControlButton>
				</div>
			</form>
		</CampfireSettingsPanel>
	);
}
