/**
 * niceTicks picks round axis values (in minutes) for a chart whose largest value is `maxMinutes`.
 * Ticks land on whole hours with a 1, 2 or 5 step so labels read "5h, 10h, 15h", never "3h 20m".
 */
export function niceTicks(maxMinutes: number): { readonly max: number; readonly ticks: readonly number[] } {
	const maxHours = Math.max(Math.ceil(maxMinutes / 60), 1);
	const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(candidate => maxHours / candidate <= 4) ?? 1000;
	const top = Math.ceil(maxHours / step) * step;
	const ticks: number[] = [];

	for (let hours = 0; hours <= top; hours += step) {
		ticks.push(hours * 60);
	}

	return { max: top * 60, ticks };
}
