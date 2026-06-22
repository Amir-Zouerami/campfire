import type { ReactElement, ReactNode } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

/**
 * CampfireConfirmDialogIntent controls the visual severity of the dialog.
 */
export type CampfireConfirmDialogIntent = 'default' | 'danger';

/**
 * CampfireConfirmDialogProps contains a reusable confirmation interaction for destructive actions.
 */
export type CampfireConfirmDialogProps = {
	readonly open: boolean;
	readonly title: string;
	readonly description: string;
	readonly confirmLabel: string;
	readonly cancelLabel?: string;
	readonly intent?: CampfireConfirmDialogIntent;
	readonly busy?: boolean;
	readonly children?: ReactNode;
	readonly onCancel: () => void;
	readonly onConfirm: () => void;
};

/**
 * CampfireConfirmDialog renders a focused, reusable confirmation modal.
 *
 * Destructive Campfire actions should go through this component instead of
 * browser confirm prompts so warnings, directionality, and loading states stay
 * consistent across the plugin.
 */
export function CampfireConfirmDialog(props: CampfireConfirmDialogProps): ReactElement | null {
	const { t } = useI18n();

	if (!props.open) {
		return null;
	}

	const intent = props.intent ?? 'default';
	const confirmVariant = intent === 'danger' ? 'destructive' : 'default';

	return (
		<div
			className="campfire-confirm-dialog-layer"
			role="presentation"
			onMouseDown={() => {
				if (props.busy !== true) {
					props.onCancel();
				}
			}}
		>
			<section
				className={`campfire-confirm-dialog campfire-confirm-dialog--${intent}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="campfire-confirm-dialog-title"
				onMouseDown={event => event.stopPropagation()}
			>
				<header className="campfire-confirm-dialog-header">
					<span className="campfire-confirm-dialog-icon" aria-hidden="true">
						<AlertTriangle className="cf:size-5" />
					</span>

					<div className="campfire-confirm-dialog-copy">
						<p className="campfire-confirm-dialog-eyebrow">{t('shared.confirmation.eyebrow')}</p>
						<h3 id="campfire-confirm-dialog-title">{props.title}</h3>
						<p>{props.description}</p>
					</div>

					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={t('shared.confirmation.close')}
						disabled={props.busy === true}
						onClick={props.onCancel}
					>
						<X className="cf:size-4" />
					</Button>
				</header>

				{props.children !== undefined && <div className="campfire-confirm-dialog-body">{props.children}</div>}

				<footer className="campfire-confirm-dialog-actions">
					<Button type="button" variant="ghost" disabled={props.busy === true} onClick={props.onCancel}>
						{props.cancelLabel ?? t('common.cancel')}
					</Button>
					<Button type="button" variant={confirmVariant} disabled={props.busy === true} onClick={props.onConfirm}>
						{props.busy === true && <Loader2 className="cf:size-4 cf:animate-spin" />}
						{props.confirmLabel}
					</Button>
				</footer>
			</section>
		</div>
	);
}
