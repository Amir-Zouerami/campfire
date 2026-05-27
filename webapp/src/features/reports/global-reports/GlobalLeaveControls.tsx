import type { ReactElement } from 'react';
import { Download, Search } from 'lucide-react';

import { CampfireDateInput } from '@/components/campfire/CampfireDateInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:lg:grid-cols-[1fr_1fr_auto_auto] cf:lg:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-global-leave-start">Start date</Label>
				<CampfireDateInput
					id="campfire-global-leave-start"
					disabled={props.disabled}
					value={props.range.startDate}
					onValueChange={value => props.onChange({ startDate: value })}
				/>
			</div>

			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-global-leave-end">End date</Label>
				<CampfireDateInput
					id="campfire-global-leave-end"
					disabled={props.disabled}
					value={props.range.endDate}
					onValueChange={value => props.onChange({ endDate: value })}
				/>
			</div>

			<Button type="button" disabled={props.disabled} onClick={() => void props.onLoad()}>
				<Search className="cf:size-4" />
				Load
			</Button>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onExport()}>
				<Download className="cf:size-4" />
				CSV
			</Button>
		</div>
	);
}
