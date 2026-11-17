import { describe, expect, it } from 'vitest';

import {
	addDays,
	calendarLabelsFor,
	diffInDays,
	eachDate,
	isIsoDate,
	normalizeDateInput,
	rangesOverlap,
	todayIn,
	weekRangeOf,
	weekStartFor,
	weekdayOf,
} from './date';

describe('date', () => {
	it('validates real calendar dates only', () => {
		expect(isIsoDate('2026-11-16')).toBe(true);
		expect(isIsoDate('2026-02-30')).toBe(false);
		expect(isIsoDate('16/11/2026')).toBe(false);
	});

	it('adds days across month, year and leap boundaries', () => {
		expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
		expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
		expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
		expect(addDays('not-a-date', 3)).toBe('not-a-date');
	});

	it('is immune to daylight saving shifts', () => {
		expect(diffInDays('2026-03-28', '2026-03-30')).toBe(2);
		expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
	});

	it('numbers weekdays like the backend (0 = Sunday)', () => {
		expect(weekdayOf('2026-11-15')).toBe(0);
		expect(weekdayOf('2026-11-16')).toBe(1);
	});

	it('builds week ranges from the workspace week start', () => {
		expect(weekRangeOf('2026-11-16', weekStartFor('Europe/Berlin'))).toEqual({ startDate: '2026-11-16', endDate: '2026-11-22' });
		expect(weekRangeOf('2026-11-16', weekStartFor('Asia/Tehran'))).toEqual({ startDate: '2026-11-14', endDate: '2026-11-20' });
	});

	it('lists inclusive date runs', () => {
		expect(eachDate('2026-11-14', '2026-11-16')).toEqual(['2026-11-14', '2026-11-15', '2026-11-16']);
		expect(eachDate('2026-11-16', '2026-11-14')).toEqual([]);
	});

	it('detects overlapping ranges', () => {
		expect(rangesOverlap({ startDate: '2026-11-14', endDate: '2026-11-16' }, { startDate: '2026-11-16', endDate: '2026-11-18' })).toBe(
			true,
		);
		expect(rangesOverlap({ startDate: '2026-11-14', endDate: '2026-11-15' }, { startDate: '2026-11-16', endDate: '2026-11-18' })).toBe(
			false,
		);
	});

	it('resolves today in the requested timezone rather than the browser zone', () => {
		const instant = new Date('2026-11-15T22:00:00Z');
		expect(todayIn('Asia/Tehran', instant)).toBe('2026-11-16');
		expect(todayIn('America/Los_Angeles', instant)).toBe('2026-11-15');
	});
});

describe('normalizeDateInput', () => {
	it('accepts ISO and US-style typed dates', () => {
		expect(normalizeDateInput('2026-11-16')).toBe('2026-11-16');
		expect(normalizeDateInput('11/6/2026')).toBe('2026-11-06');
		expect(normalizeDateInput('2026-13-01')).toBeNull();
		expect(normalizeDateInput('')).toBeNull();
	});
});

describe('calendarLabelsFor', () => {
	it('only labels Tehran workspaces, using the Jalali calendar', () => {
		expect(calendarLabelsFor(['2026-11-16'], 'Europe/Berlin')).toEqual({});
		const labels = calendarLabelsFor(['2026-11-16', 'bad'], 'Asia/Tehran');
		expect(Object.keys(labels)).toEqual(['2026-11-16']);
		expect(labels['2026-11-16']).toContain('آبان');
	});
});
