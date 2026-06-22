import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';

import {
	globalTimeGroupByOptions,
	toTimeReportGroupBy,
} from './global-reports.helpers';
import { globalReportGroupByLabel } from './global-reports.i18n';
import type { GlobalTimeReportFilter, GlobalTimeReportFilterPatch } from './global-reports.types';

/**
 * GlobalTimeControlsProps contains global time report filters and actions.
 */
type GlobalTimeControlsProps = {
	readonly filter: GlobalTimeReportFilter;
	readonly disabled: boolean;
	readonly onChange: (patch: GlobalTimeReportFilterPatch) => void;
	readonly onLoad: () => Promise<void>;
	readonly onExport: () => Promise<void>;
};

/**
 * GlobalTimeControls renders date/group filters and load/export actions.
 */
export function GlobalTimeControls(props: GlobalTimeControlsProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-control-grid campfire-control-grid--global-time-report">
			<CampfireField id="campfire-global-time-start" label={t('reports.global.controls.startDate')}>
				<CampfireDateInput
					id="campfire-global-time-start"
					disabled={props.disabled}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-time-end" label={t('reports.global.controls.endDate')}>
				<CampfireDateInput
					id="campfire-global-time-end"
					disabled={props.disabled}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-time-group" label={t('reports.global.controls.groupBy')}>
				<CampfireSelect
					id="campfire-global-time-group"
					disabled={props.disabled}
					value={props.filter.groupBy}
					onValueChange={value => props.onChange({ groupBy: toTimeReportGroupBy(value) })}
				>
					{globalTimeGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{globalReportGroupByLabel(groupBy, t)}
						</option>
					))}
				</CampfireSelect>
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
