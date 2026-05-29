import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { Toaster } from 'sonner';

import { CAMPFIRE_API_ERROR_EVENT, isCampfireAPIErrorEvent } from '@/api/errors';

import { campfireToast } from './campfire-toast';

/**
 * CampfireToastHost renders the single Campfire notification stack.
 *
 * It intentionally lives inside the Campfire overlay instead of relying on an
 * app-wide Mattermost portal, keeping styles scoped to `.campfire-theme`.
 */
export function CampfireToastHost(): ReactElement {
	useEffect(() => {
		/**
		 * handleAPIError converts any API-layer failure into a bottom-right toast.
		 */
		function handleAPIError(event: Event): void {
			if (!isCampfireAPIErrorEvent(event)) {
				return;
			}

			campfireToast.error(event.detail.error);
		}

		window.addEventListener(CAMPFIRE_API_ERROR_EVENT, handleAPIError);

		return () => {
			window.removeEventListener(CAMPFIRE_API_ERROR_EVENT, handleAPIError);
		};
	}, []);

	return (
		<Toaster
			className="campfire-toast-host"
			closeButton={true}
			expand={false}
			gap={10}
			icons={{
				error: <XCircle className="campfire-toast-icon" />,
				info: <Info className="campfire-toast-icon" />,
				loading: <Loader2 className="campfire-toast-icon campfire-toast-icon--spin" />,
				success: <CheckCircle2 className="campfire-toast-icon" />,
				warning: <AlertTriangle className="campfire-toast-icon" />,
			}}
			position="bottom-right"
			theme="dark"
			toastOptions={{
				classNames: {
					actionButton: 'campfire-toast-action',
					cancelButton: 'campfire-toast-cancel',
					closeButton: 'campfire-toast-close',
					description: 'campfire-toast-description',
					icon: 'campfire-toast-icon-slot',
					toast: 'campfire-toast',
					title: 'campfire-toast-title',
				},
			}}
			visibleToasts={4}
		/>
	);
}
