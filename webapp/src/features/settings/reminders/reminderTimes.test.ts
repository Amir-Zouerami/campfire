import { describe, expect, it } from 'vitest';

import { checkReminderTimes, offsetsToTimes, timesToOffsets } from './reminderTimes';

describe('reminder times', () => {
	it('round-trips offsets through clock times', () => {
		expect(offsetsToTimes([45, 135], '09:00', '10:30')).toEqual(['09:45', '', '']);
	});

	it('drops times outside the window and de-duplicates', () => {
		expect(timesToOffsets(['09:45', '09:45', '08:00', '10:30', 'x'], '09:00', '10:30')).toEqual([45]);
	});

	it('classifies problems', () => {
		expect(checkReminderTimes(['', '', ''], '09:00', '10:30')).toBe('chooseOne');
		expect(checkReminderTimes(['11:00'], '09:00', '10:30')).toBe('insideWindow');
		expect(checkReminderTimes(['09:30', '11:00'], '09:00', '10:30')).toBe('partialSave');
		expect(checkReminderTimes(['09:30'], '09:00', '10:30')).toBe('none');
	});
});
