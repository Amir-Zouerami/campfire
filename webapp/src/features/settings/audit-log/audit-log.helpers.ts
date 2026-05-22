import { ApiClientError } from '@/api';
import type { AuditLogEntry } from '@/types/domain';

import type { AuditActionCount, AuditLimitOption } from './audit-log.types';

/**
 * auditLimitOptions lists supported audit-log limits.
 */
export const auditLimitOptions: readonly AuditLimitOption[] = [25, 50, 100, 200];

/**
 * collectAuditActorUserIDs returns unique actor user IDs.
 */
export function collectAuditActorUserIDs(entries: readonly AuditLogEntry[]): readonly string[] {
	return uniqueStrings(entries.map(entry => entry.actorUserId));
}

/**
 * countAuditActions returns action counts ordered by frequency.
 */
export function countAuditActions(entries: readonly AuditLogEntry[]): readonly AuditActionCount[] {
	const counts = new Map<string, number>();

	for (const entry of entries) {
		counts.set(entry.action, (counts.get(entry.action) ?? 0) + 1);
	}

	return [...counts.entries()]
		.map(([action, count]) => ({ action, count }))
		.sort((first, second) => second.count - first.count || first.action.localeCompare(second.action));
}

/**
 * formatAuditLabel converts enum-like audit values to readable labels.
 */
export function formatAuditLabel(value: string): string {
	if (value.trim() === '') {
		return 'Unknown';
	}

	return value
		.split(/[_\s-]+/)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/**
 * formatDateTime formats an API timestamp for compact display.
 */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

/**
 * shortID returns a compact ID label.
 */
export function shortID(value: string): string {
	if (value.length <= 10) {
		return value;
	}

	return value.slice(0, 10);
}

/**
 * toAuditLimitOption narrows a select value to an audit limit.
 */
export function toAuditLimitOption(value: string): AuditLimitOption {
	if (value === '25' || value === '100' || value === '200') {
		return Number.parseInt(value, 10) as AuditLimitOption;
	}

	return 50;
}

/**
 * errorToMessage converts unknown thrown values into a safe UI message.
 */
export function errorToMessage(error: unknown): string {
	if (error instanceof ApiClientError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Could not load the audit log.';
}

/**
 * uniqueStrings returns unique non-empty strings.
 */
function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}
