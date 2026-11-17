import type { TFunction } from '@/shared/i18n';

/**
 * auditLabel turns a machine name ("leave_request_approved") into readable words
 * ("Leave Request Approved"). Audit names come from the server and are not translated.
 */
export function auditLabel(value: string, t: TFunction): string {
	if (value.trim() === '') {
		return t('settings.audit.unknown');
	}

	return value
		.split(/[_\s-]+/)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
