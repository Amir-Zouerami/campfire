import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { useI18n } from '@/i18n';

import type { GlobalDateRange, GlobalDateRangePatch } from './global-reports.types';

/**
 * GlobalLeaveControlsProps contains global leave report filters and actions.
 */
type GlobalLeaveControlsProps = {
	readonly range: GlobalDateRange;
	readonly disabled: boolean;
	readonly onChange: (patch: GlobalDateRangePatch) => void;
	readonly onLoad: () => Promise<void>;
	readonly onExport: () => Promise<void>;
};

/**
 * GlobalLeaveControls renders date filters and load/export actions.
 */
export function GlobalLeaveControls(props: GlobalLeaveControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-control-grid campfire-control-grid--global-leave-report">
			<CampfireField id="campfire-global-leave-start" label={t('reports.global.controls.startDate')}>
				<CampfireDateInput
					id="campfire-global-leave-start"
					disabled={props.disabled}
					value={props.range.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-leave-end" label={t('reports.global.controls.endDate')}>
				<CampfireDateInput
					id="campfire-global-leave-end"
					disabled={props.disabled}
					value={props.range.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireControlButton type="button" disabled={props.disabled} onClick={() => void props.onLoad()}>
				<Search className="cf:size-4" />
				{t('reports.global.actions.load')}
			</CampfireControlButton>

			<CampfireControlButton type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onExport()}>
				<Download className="cf:size-4" />
				{t('reports.global.actions.csv')}
			</CampfireControlButton>
		</div>
	);
}
