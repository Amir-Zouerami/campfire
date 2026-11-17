import { describe, expect, it } from 'vitest';

import type { SavedReportFilter } from '@/shared/types/domain';

import { filterDailySort, filterDate, filterGrouping, filterWeeklySort, parseFilter } from './appliedFilter';

const saved = (filterJson: string): SavedReportFilter => ({
	id: 'f',
	workspaceId: 'w',
	userId: 'u',
	name: 'n',
	scope: 'workspace',
	reportType: 'daily',
	filterJson,
	createdAt: '',
	updatedAt: '',
});

describe('applied saved filters', () => {
	it('only accepts JSON objects', () => {
		expect(parseFilter(saved('{"a":1}'))).toEqual({ a: 1 });
		expect(parseFilter(saved('[1]'))).toBeNull();
		expect(parseFilter(saved('nope'))).toBeNull();
	});

	it('reads known fields and falls back for unknown values', () => {
		const record = { occurrenceDate: '6/4/2026', sortMode: 'bogus', groupBy: 'task' };
		expect(filterDate(record, 'occurrenceDate')).toBe('2026-06-04');
		expect(filterDate(record, 'missing')).toBeUndefined();
		expect(filterDailySort(record)).toBe('first_submitted');
		expect(filterWeeklySort({ sortMode: 'blockers_first' })).toBe('blockers_first');
		expect(filterDailySort({ sortMode: 'blockers_first' })).toBe('first_submitted');
		expect(filterGrouping(record)).toBe('task');
		expect(filterGrouping({})).toBe('person');
	});
});
