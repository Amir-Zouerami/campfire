import type { ReactElement } from 'react';
import { X } from 'lucide-react';

import { useUserProfiles } from '@/app/useUserProfiles';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

import { CampfireUserPicker } from './CampfireUserPicker';

/**
 * CampfireUserMultiPickerProps contains a controlled member-recipient picker.
 */
type CampfireUserMultiPickerProps = {
	readonly workspaceID: string;
	readonly selectedUserIDs: readonly string[];
	readonly disabled?: boolean;
	readonly placeholder?: string;
	readonly emptyLabel?: string;
	readonly className?: string;
	readonly onChange: (userIDs: readonly string[]) => void;
};

/**
 * CampfireUserMultiPicker composes the single-user workspace picker into a
 * deterministic multi-recipient selector without leaking raw IDs into the
 * primary admin workflow.
 */
export function CampfireUserMultiPicker(props: CampfireUserMultiPickerProps): ReactElement {
	const profiles = useUserProfiles(props.selectedUserIDs);
	const selectedSet = new Set(props.selectedUserIDs);
	const { t } = useI18n();

	/**
	 * addUser appends a picked user while preserving the admin's chosen order.
	 */
	function addUser(userID: string): void {
		const cleanUserID = userID.trim();
		if (cleanUserID === '' || selectedSet.has(cleanUserID)) {
			return;
		}

		props.onChange([...props.selectedUserIDs, cleanUserID]);
	}

	/**
	 * removeUser removes a selected recipient.
	 */
	function removeUser(userID: string): void {
		props.onChange(props.selectedUserIDs.filter(selectedUserID => selectedUserID !== userID));
	}

	return (
		<div className={cn('campfire-user-multi-picker', props.className)}>
			<CampfireUserPicker
				workspaceID={props.workspaceID}
				value=""
				disabled={props.disabled}
				placeholder={props.placeholder ?? t('shared.userMultiPicker.addRecipient')}
				onChange={addUser}
			/>

			<div className="campfire-user-multi-picker-list" aria-live="polite">
				{props.selectedUserIDs.length === 0 && (
					<span className="campfire-user-multi-picker-empty">
						{props.emptyLabel ?? t('shared.userMultiPicker.empty')}
					</span>
				)}

				{props.selectedUserIDs.map(userID => (
					<span key={userID} className="campfire-user-multi-picker-chip">
						<bdi dir="auto">{profiles.labelForUserID(userID)}</bdi>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={props.disabled}
							onClick={() => removeUser(userID)}
							aria-label={t('shared.userMultiPicker.removeRecipient', { user: profiles.labelForUserID(userID) })}
						>
							<X className="cf:size-3" />
						</Button>
					</span>
				))}
			</div>
		</div>
	);
}
