import type { ReactElement } from 'react';
import { RefreshCcw } from 'lucide-react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';

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
			<CampfireField id="campfire-audit-limit" label="Rows to load">
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
			</CampfireField>

			<Button type="button" variant="secondary" disabled={props.disabled} onClick={() => void props.onReload()}>
				<RefreshCcw className="cf:size-4" />
				Reload
			</Button>
		</div>
	);
}
