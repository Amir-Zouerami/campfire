import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { Heading } from '../layout/Heading';
import { Text } from '../layout/Text';
import { IconButton } from '../primitives/IconButton';
import { usePortalContainer } from './PortalContainer';

const SIZE_CLASS = {
	sm: 'cf:w-[min(448px,calc(100vw_-_32px))]',
	md: 'cf:w-[min(640px,calc(100vw_-_32px))]',
	/** The Campfire application window. */
	app: 'cf:h-[min(96vh,1040px)] cf:w-[min(96vw,1620px)]',
} as const;

type ModalProps = {
	readonly open: boolean;
	readonly onClose: () => void;
	/** Accessible name; shown as a heading unless `hideTitle` is set. */
	readonly title: string;
	readonly hideTitle?: boolean;
	readonly description?: string;
	readonly size?: keyof typeof SIZE_CLASS;
	readonly footer?: ReactNode;
	/** Makes the dialog a form: body and footer share one `<form>`, so a footer submit button works. */
	readonly onSubmit?: () => void;
	readonly children: ReactNode;
};

/**
 * Modal is Campfire's single dialog: focus-trapped, dismissible with Escape, rendered into
 * the Campfire root element. The application window itself is a Modal of size `app`.
 */
export function Modal(props: ModalProps): ReactElement {
	const { t } = useI18n();
	const container = usePortalContainer();
	const size = props.size ?? 'md';

	return (
		<Dialog.Root open={props.open} onOpenChange={open => !open && props.onClose()}>
			<Dialog.Portal container={container}>
				<Dialog.Backdrop className="cf:fixed cf:inset-0 cf:z-[99998] cf:bg-overlay cf:transition-opacity cf:data-ending-style:opacity-0 cf:data-starting-style:opacity-0" />
				<Dialog.Viewport className="cf:fixed cf:inset-0 cf:z-[99999] cf:grid cf:place-items-center cf:p-4">
					<Dialog.Popup
						className={cn(
							'cf:flex cf:max-h-full cf:max-w-full cf:flex-col cf:overflow-hidden cf:rounded-[20px] cf:bg-canvas cf:text-ink cf:shadow-modal cf:outline-none',
							'cf:transition-[opacity,transform] cf:data-ending-style:scale-[0.98] cf:data-ending-style:opacity-0 cf:data-starting-style:scale-[0.98] cf:data-starting-style:opacity-0',
							SIZE_CLASS[size],
						)}
					>
						{size === 'app' ? (
							<Dialog.Title className="cf:sr-only">{props.title}</Dialog.Title>
						) : (
							<header className="cf:flex cf:items-start cf:justify-between cf:gap-4 cf:border-b cf:border-line cf:bg-surface cf:px-6 cf:py-5">
								<div className="cf:flex cf:flex-col cf:gap-1">
									<Dialog.Title className={props.hideTitle === true ? 'cf:sr-only' : 'cf:m-0'}>
										<Heading level={2}>{props.title}</Heading>
									</Dialog.Title>
									{props.description !== undefined && (
										<Dialog.Description className="cf:m-0">
											<Text tone="muted">{props.description}</Text>
										</Dialog.Description>
									)}
								</div>
								<Dialog.Close render={<IconButton icon={X} label={t('common.close')} variant="ghost" />} />
							</header>
						)}
						<DialogBody onSubmit={props.onSubmit}>
							<div className={cn('cf:min-h-0 cf:flex-1 cf:overflow-y-auto cf:bg-surface', size !== 'app' && 'cf:px-6 cf:py-5')}>
								{props.children}
							</div>
							{props.footer !== undefined && (
								<footer className="cf:flex cf:justify-end cf:gap-3 cf:border-t cf:border-line cf:bg-surface cf:px-6 cf:py-4">
									{props.footer}
								</footer>
							)}
						</DialogBody>
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/**
 * DialogBody is a plain column, or a `<form>` when the dialog collects input.
 */
function DialogBody(props: { readonly onSubmit?: () => void; readonly children: ReactNode }): ReactElement {
	const className = 'cf:flex cf:min-h-0 cf:flex-1 cf:flex-col';

	if (props.onSubmit === undefined) {
		return <div className={className}>{props.children}</div>;
	}

	const submit = props.onSubmit;

	return (
		<form
			noValidate
			className={className}
			onSubmit={event => {
				event.preventDefault();
				submit();
			}}
		>
			{props.children}
		</form>
	);
}
