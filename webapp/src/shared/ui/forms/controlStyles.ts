/**
 * CONTROL_CLASS is the single visual definition of a text-like form control.
 * Every input, select, textarea, date and combobox shares it so they always match.
 */
export const CONTROL_CLASS = [
	'cf:block cf:w-full cf:min-h-11 cf:rounded-control cf:border cf:border-line-strong cf:bg-surface cf:px-3.5',
	'cf:text-sm cf:text-ink cf:placeholder:text-subtle cf:transition-shadow',
	'cf:focus-visible:outline-2 cf:focus-visible:outline-offset-1 cf:focus-visible:outline-area',
	'cf:disabled:cursor-not-allowed cf:disabled:bg-sunken cf:disabled:text-muted',
	'cf:aria-invalid:border-rose cf:aria-invalid:outline-rose',
].join(' ');

/**
 * POPUP_CLASS styles floating panels (calendar, combobox list).
 */
export const POPUP_CLASS = 'cf:rounded-panel cf:bg-surface cf:p-1.5 cf:shadow-popover cf:text-ink';
