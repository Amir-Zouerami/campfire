import type { ReactElement } from 'react';
import { RefreshCcw } from 'lucide-react';

import { CampfireControlButton } from '@/components/campfire/CampfireControlButton';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';

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
		<div className="campfire-audit-controls campfire-audit-controls--flat">
			<label htmlFor="campfire-audit-limit" className="campfire-compact-control-label">
				Rows
			</label>
			<CampfireSelect
				id="campfire-audit-limit"
				disabled={props.disabled}
				value={String(props.limit)}
				onValueChange={value => props.onLimitChange(toAuditLimitOption(value))}
			>
				{auditLimitOptions.map(limit => (
					<option key={limit} value={String(limit)}>
						Last {limit}
					</option>
				))}
			</CampfireSelect>

			<CampfireControlButton type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onReload()}>
				<RefreshCcw className="cf:size-4" />
				Reload
			</CampfireControlButton>
		</div>
	);
}
