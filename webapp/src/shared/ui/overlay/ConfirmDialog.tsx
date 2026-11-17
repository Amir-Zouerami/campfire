import type { ReactElement, ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';

import { Button } from '../primitives/Button';
import { Modal } from './Modal';

type ConfirmDialogProps = {
	readonly open: boolean;
	readonly title: string;
	readonly description: string;
	readonly confirmLabel: string;
	readonly tone?: 'default' | 'danger';
	readonly loading?: boolean;
	/** Extra consequences worth listing, such as what else gets deleted. */
	readonly children?: ReactNode;
	readonly onConfirm: () => void;
	readonly onCancel: () => void;
};

/**
 * ConfirmDialog asks the user to confirm a consequential action.
 */
export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
	const { t } = useI18n();

	return (
		<Modal
			open={props.open}
			size="sm"
			title={props.title}
			description={props.description}
			onClose={props.onCancel}
			footer={
				<>
					<Button variant="secondary" onClick={props.onCancel} disabled={props.loading}>
						{t('common.cancel')}
					</Button>
					<Button variant={props.tone === 'danger' ? 'danger' : 'primary'} loading={props.loading} onClick={props.onConfirm}>
						{props.confirmLabel}
					</Button>
				</>
			}
		>
			{props.children ?? <span className="cf:sr-only">{props.description}</span>}
		</Modal>
	);
}
