import { describe, expect, it } from 'vitest';

import { niceTicks } from './chart';

describe('niceTicks', () => {
	it('rounds the axis up to whole, evenly stepped hours', () => {
		expect(niceTicks(27 * 60)).toEqual({ max: 30 * 60, ticks: [0, 600, 1200, 1800].map(value => value) });
		expect(niceTicks(90)).toEqual({ max: 120, ticks: [0, 60, 120] });
		expect(niceTicks(0)).toEqual({ max: 60, ticks: [0, 60] });
	});
});
