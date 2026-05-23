import type { ReactElement } from 'react';
import { RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { auditLimitOptions, toAuditLimitOption } from './audit-log.helpers';
import type { AuditLimitOption } from './audit-log.types';

/**
 * AuditLogControlsProps contains audit-log limit controls.
 */
type AuditLogControlsProps = {
	readonly limit: AuditLimitOption;
	readonly disabled: boolean;
	readonly onLimitChange: (limit: AuditLimitOption) => void;
	readonly onReload: () => Promise<void>;
};

/**
 * AuditLogControls renders audit-log filter controls.
 */
export function AuditLogControls(props: AuditLogControlsProps): ReactElement {
	return (
		<div className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5 cf:sm:grid-cols-[1fr_auto] cf:sm:items-end">
			<div className="cf:grid cf:gap-2">
				<Label htmlFor="campfire-audit-limit">Rows to load</Label>
				<select
					id="campfire-audit-limit"
					disabled={props.disabled}
					value={props.limit}
					className="cf:h-11 cf:w-full cf:rounded-xl cf:border cf:border-white/10 cf:bg-black/25 cf:px-3 cf:py-2 cf:text-base cf:font-semibold cf:text-foreground cf:outline-none cf:focus-visible:border-amber-300/45 cf:focus-visible:ring-2 cf:focus-visible:ring-amber-300/20"
					onChange={event => props.onLimitChange(toAuditLimitOption(event.currentTarget.value))}
				>
					{auditLimitOptions.map(limit => (
						<option key={limit} value={limit}>
							Last {limit}
						</option>
					))}
				</select>
			</div>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onReload()}>
				<RefreshCcw className="cf:size-4" />
				Reload
			</Button>
		</div>
	);
}
