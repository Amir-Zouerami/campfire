import { ApiClientError } from '@/shared/api';

/**
 * submitForm runs a form's validation and submit handler from an event handler.
 *
 * A failed save rejects the submit promise. The API layer has already told the user (every
 * failed request raises a toast), so the rejection is finished business here; leaving it
 * unhandled would only add a second, raw error to the browser console. Anything that is not an
 * API failure is a programming error and is still reported.
 */
export function submitForm(form: { readonly handleSubmit: () => Promise<unknown> }): void {
	form.handleSubmit().catch((error: unknown) => {
		if (!(error instanceof ApiClientError)) {
			console.error('Campfire form submit failed', error);
		}
	});
}
