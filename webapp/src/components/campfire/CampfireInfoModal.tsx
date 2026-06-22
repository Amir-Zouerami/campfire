import { createPortal } from 'react-dom';
import type { ReactElement, ReactNode } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

/**
 * CampfireInfoModalProps contains one help modal rendered above the Campfire shell.
 */
export type CampfireInfoModalProps = {
	readonly title: string;
	readonly description: string;
	readonly open: boolean;
	readonly children: ReactNode;
	readonly onClose: () => void;
};

/**
 * CampfireInfoModal renders documentation in a body portal above the main Campfire modal.
 */
export function CampfireInfoModal(
	props: CampfireInfoModalProps,
): ReactElement | null {
	const { direction, htmlLang, language, t } = useI18n();

	if (!props.open || typeof document === 'undefined') {
		return null;
	}

	const modal = (
		<div
			className="campfire-info-modal-portal campfire-theme dark"
			dir={direction}
			lang={htmlLang}
			data-campfire-language={language}
		>
			<div
				className="campfire-info-modal-layer"
				role="presentation"
				onMouseDown={props.onClose}
			>
				<section
					className="campfire-info-modal"
					role="dialog"
					aria-modal="true"
					aria-label={props.title}
					onMouseDown={(event) => event.stopPropagation()}
				>
					<header className="campfire-info-modal-header">
						<div>
							<p className="campfire-info-modal-eyebrow">{t('shared.help.eyebrow')}</p>
							<h3>{props.title}</h3>
							<p>{props.description}</p>
						</div>
						<Button
							type="button"
							variant="secondary"
							size="icon-sm"
							aria-label={t('shared.help.close')}
							onClick={props.onClose}
						>
							<X className="cf:size-4" />
						</Button>
					</header>

					<div className="campfire-info-modal-body">{props.children}</div>
				</section>
			</div>
		</div>
	);

	return createPortal(modal, document.body);
}
