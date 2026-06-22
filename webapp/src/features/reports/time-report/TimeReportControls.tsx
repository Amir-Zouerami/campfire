import type { ReactElement } from 'react';
import { Search } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { useI18n } from '@/i18n';

import { timeReportGroupByOptions, toTimeReportGroupBy } from './time-report.helpers';
import { timeReportGroupByLabel } from './time-report.i18n';
import type { TimeReportFilterDraft, TimeReportFilterPatch } from './time-report.types';

/**
 * TimeReportControlsProps contains time report filter state and actions.
 */
type TimeReportControlsProps = {
	readonly filter: TimeReportFilterDraft;
	readonly disabled: boolean;
	readonly timezone: string;
	readonly onChange: (patch: TimeReportFilterPatch) => void;
	readonly onLoad: () => Promise<void>;
};

/**
 * TimeReportControls renders date range and grouping controls.
 */
export function TimeReportControls(props: TimeReportControlsProps): ReactElement {
	const { t } = useI18n();

	/**
	 * handleLoad loads the current report.
	 */
	function handleLoad(): void {
		void props.onLoad();
	}

	return (
		<div className="campfire-control-grid campfire-control-grid--time-report">
			<CampfireField id="campfire-time-report-start" label={t('reports.time.field.startDate')}>
				<CampfireDateInput
					id="campfire-time-report-start"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.filter.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-time-report-end" label={t('reports.time.field.endDate')}>
				<CampfireDateInput
					id="campfire-time-report-end"
					disabled={props.disabled}
					timezone={props.timezone}
					value={props.filter.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-time-report-group" label={t('reports.time.field.groupBy')}>
				<CampfireSelect
					id="campfire-time-report-group"
					disabled={props.disabled}
					value={props.filter.groupBy}
					onValueChange={value => props.onChange({ groupBy: toTimeReportGroupBy(value) })}
				>
					{timeReportGroupByOptions.map(groupBy => (
						<option key={groupBy} value={groupBy}>
							{timeReportGroupByLabel(groupBy, t)}
						</option>
					))}
				</CampfireSelect>
			</CampfireField>

			<CampfireControlButton type="button" disabled={props.disabled} onClick={handleLoad}>
				<Search className="cf:size-4" />
				{t('reports.time.action.load')}
			</CampfireControlButton>
		</div>
	);
}
