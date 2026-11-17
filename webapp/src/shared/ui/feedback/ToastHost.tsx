import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { Icon } from '../primitives/Icon';
import { dismissToast, useToasts } from './toast';

const TONE = {
	success: { icon: CheckCircle2, tone: 'success' },
	error: { icon: XCircle, tone: 'danger' },
	info: { icon: Info, tone: 'muted' },
} as const;

/**
 * ToastHost renders the visible toasts. Mount it once inside the Campfire overlay.
 */
export function ToastHost(): ReactElement {
	const { t } = useI18n();
	const toasts = useToasts();

	return (
		<div
			aria-live="polite"
			className="cf:pointer-events-none cf:fixed cf:inset-x-0 cf:bottom-6 cf:z-[100001] cf:flex cf:flex-col cf:items-center cf:gap-2 cf:px-4"
		>
			{toasts.map(item => (
				<div
					key={item.id}
					role={item.tone === 'error' ? 'alert' : 'status'}
					className={cn(
						'cf:pointer-events-auto cf:flex cf:max-w-lg cf:items-start cf:gap-3 cf:rounded-panel cf:bg-brand cf:px-4 cf:py-3 cf:text-on-brand cf:shadow-modal',
					)}
				>
					<span className="cf:mt-0.5 cf:text-on-brand">
						<Icon icon={TONE[item.tone].icon} size="md" />
					</span>
					<span className="cf:flex-1 cf:text-sm cf:font-medium" dir="auto">
						{item.message}
					</span>
					<button
						type="button"
						aria-label={t('common.close')}
						onClick={() => dismissToast(item.id)}
						className="cf:m-0 cf:grid cf:size-6 cf:cursor-pointer cf:appearance-none cf:place-items-center cf:rounded-md cf:border-0 cf:bg-transparent cf:p-0 cf:text-on-brand cf:opacity-70 cf:hover:opacity-100"
					>
						<Icon icon={X} size="sm" />
					</button>
				</div>
			))}
		</div>
	);
}
