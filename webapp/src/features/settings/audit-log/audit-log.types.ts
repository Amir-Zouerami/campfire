import type { AuditLogEntry } from '@/types/domain';

/**
 * AuditLogLoadState describes audit-log loading state.
 */
export type AuditLogLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * AuditLimitOption is a supported audit-log row limit.
 */
export type AuditLimitOption = 25 | 50 | 100 | 200;

/**
 * AuditActionCount stores one action count.
 */
export type AuditActionCount = {
	readonly action: string;
	readonly count: number;
};

/**
 * AuditEntryWithActor pairs an audit entry with a display label.
 */
export type AuditEntryWithActor = {
	readonly entry: AuditLogEntry;
	readonly actorLabel: string;
};
