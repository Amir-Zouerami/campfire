import { describe, expect, it } from 'vitest';

import { sameWeekdays, toggleWeekday } from './weekdays';

describe('working weekdays', () => {
	it('toggles and keeps order', () => {
		expect(toggleWeekday([1, 3], 2)).toEqual([1, 2, 3]);
		expect(toggleWeekday([1, 2, 3], 2)).toEqual([1, 3]);
	});

	it('compares regardless of order', () => {
		expect(sameWeekdays([6, 0, 1], [0, 1, 6])).toBe(true);
		expect(sameWeekdays([0, 1], [0, 1, 2])).toBe(false);
	});
});
