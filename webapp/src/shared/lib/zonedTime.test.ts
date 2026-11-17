import { describe, expect, it } from 'vitest';

import { zonedDateTimeToInstant } from './zonedTime';

describe('zonedDateTimeToInstant', () => {
	it('converts wall-clock times to the right instant for fixed-offset zones', () => {
		expect(zonedDateTimeToInstant('2026-11-16', '09:00', 'Asia/Tehran')?.toISOString()).toBe('2026-11-16T05:30:00.000Z');
		expect(zonedDateTimeToInstant('2026-11-16', '00:00', 'UTC')?.toISOString()).toBe('2026-11-16T00:00:00.000Z');
	});

	it('honours daylight saving on both sides of a transition', () => {
		expect(zonedDateTimeToInstant('2026-07-01', '12:00', 'Europe/Berlin')?.toISOString()).toBe('2026-07-01T10:00:00.000Z');
		expect(zonedDateTimeToInstant('2026-12-01', '12:00', 'Europe/Berlin')?.toISOString()).toBe('2026-12-01T11:00:00.000Z');
		expect(zonedDateTimeToInstant('2026-12-01', '12:00', 'America/Los_Angeles')?.toISOString()).toBe('2026-12-01T20:00:00.000Z');
	});

	it('rejects malformed input and unknown zones', () => {
		expect(zonedDateTimeToInstant('2026-13-01', '12:00', 'UTC')).toBeNull();
		expect(zonedDateTimeToInstant('2026-11-16', 'noon', 'UTC')).toBeNull();
		expect(zonedDateTimeToInstant('2026-11-16', '12:00', 'Mars/Olympus')).toBeNull();
	});
});
