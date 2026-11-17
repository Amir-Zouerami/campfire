import { describe, expect, it } from 'vitest';

import { formatMinutes, minutesToTimeOfDay, normalizeTimeInput, parseDurationMinutes, timeOfDayToMinutes } from './duration';

describe('duration', () => {
	it('formats minutes compactly', () => {
		expect(formatMinutes(0)).toBe('0m');
		expect(formatMinutes(50)).toBe('50m');
		expect(formatMinutes(60)).toBe('1h');
		expect(formatMinutes(90)).toBe('1h 30m');
	});

	it('parses the common duration spellings', () => {
		expect(parseDurationMinutes('90')).toBe(90);
		expect(parseDurationMinutes('1h 30m')).toBe(90);
		expect(parseDurationMinutes('1.5h')).toBe(90);
		expect(parseDurationMinutes('1:30')).toBe(90);
		expect(parseDurationMinutes('45m')).toBe(45);
		expect(parseDurationMinutes('soon')).toBeNull();
		expect(parseDurationMinutes('')).toBeNull();
	});

	it('round-trips times of day', () => {
		expect(timeOfDayToMinutes('09:30')).toBe(570);
		expect(minutesToTimeOfDay(570)).toBe('09:30');
		expect(timeOfDayToMinutes('24:00')).toBeNull();
	});
});

describe('normalizeTimeInput', () => {
	it('accepts the spellings people type', () => {
		expect(normalizeTimeInput('930')).toBe('09:30');
		expect(normalizeTimeInput('9:30')).toBe('09:30');
		expect(normalizeTimeInput('9.5')).toBe('09:05');
		expect(normalizeTimeInput('14')).toBe('14:00');
		expect(normalizeTimeInput('0005')).toBe('00:05');
	});

	it('rejects impossible times', () => {
		expect(normalizeTimeInput('24:00')).toBeNull();
		expect(normalizeTimeInput('12:60')).toBeNull();
		expect(normalizeTimeInput('noon')).toBeNull();
	});
});
