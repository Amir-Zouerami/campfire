import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { Button } from '@/shared/ui';

import { useFormContext } from './form';

type SubmitButtonProps = {
	readonly label: string;
	readonly icon?: LucideIcon;
	/** Greys the button out until the form has unsaved changes. */
	readonly requireChanges?: boolean;
	readonly variant?: 'primary' | 'secondary';
};

/**
 * SubmitButton submits the surrounding form and shows progress while it saves.
 */
export function SubmitButton(props: SubmitButtonProps): ReactElement {
	const form = useFormContext();

	return (
		<form.Subscribe selector={state => ({ submitting: state.isSubmitting, dirty: state.isDirty })}>
			{({ submitting, dirty }) => (
				<Button
					type="submit"
					variant={props.variant}
					icon={props.icon}
					loading={submitting}
					disabled={props.requireChanges === true && !dirty}
				>
					{props.label}
				</Button>
			)}
		</form.Subscribe>
	);
}
