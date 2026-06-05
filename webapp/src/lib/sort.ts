/**
 * sortByNewest returns a copy sorted by the newest date-like value first.
 */
export function sortByNewest<TItem>(
  items: readonly TItem[],
  getDateValue: (item: TItem) => string,
): TItem[] {
  return [...items].sort((first, second) =>
    compareDateValues(getDateValue(second), getDateValue(first)),
  );
}

/**
 * compareDateValues compares two API date/date-time strings defensively.
 */
function compareDateValues(first: string, second: string): number {
  const firstTimestamp = dateValueToTimestamp(first);
  const secondTimestamp = dateValueToTimestamp(second);

  if (firstTimestamp !== secondTimestamp) {
    return firstTimestamp - secondTimestamp;
  }

  return first.localeCompare(second);
}

/**
 * dateValueToTimestamp converts API date values to sortable timestamps.
 */
function dateValueToTimestamp(value: string): number {
  const cleanValue = value.trim();
  if (cleanValue === "") {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(cleanValue);
  if (Number.isNaN(timestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return timestamp;
}
