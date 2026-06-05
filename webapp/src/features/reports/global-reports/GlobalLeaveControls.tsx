import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { CampfireField } from '@/components/campfire/CampfireField';

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
	return (
		<div className="campfire-control-grid campfire-control-grid--global-leave-report">
			<CampfireField id="campfire-global-leave-start" label="Start date">
				<CampfireDateInput
					id="campfire-global-leave-start"
					disabled={props.disabled}
					value={props.range.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</CampfireField>

			<CampfireField id="campfire-global-leave-end" label="End date">
				<CampfireDateInput
					id="campfire-global-leave-end"
					disabled={props.disabled}
					value={props.range.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</CampfireField>

			<CampfireControlButton type="button" disabled={props.disabled} onClick={() => void props.onLoad()}>
				<Search className="cf:size-4" />
				Load
			</CampfireControlButton>

			<CampfireControlButton type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onExport()}>
				<Download className="cf:size-4" />
				CSV
			</CampfireControlButton>
		</div>
	);
}
