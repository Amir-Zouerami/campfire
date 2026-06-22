import type { DataRetentionSummary } from '@/types/api';

/**
 * DataManagementFeedbackTone describes inline data-management feedback.
 */
export type DataManagementFeedbackTone = 'success' | 'error' | 'warning';

/**
 * DataRetentionMetric describes one row-count card in retention preview.
 */
export type DataRetentionMetric = {
	readonly key: keyof Omit<DataRetentionSummary, 'cutoffDate' | 'totalRows'>;
	readonly label: string;
	readonly description: string;
};
