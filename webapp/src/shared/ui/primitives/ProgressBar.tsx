import type { ReactElement } from 'react';

type ProgressBarProps = {
	/** Fraction between 0 and 1. */
	readonly value: number;
	readonly label: string;
};

/**
 * ProgressBar shows a completed fraction.
 */
export function ProgressBar(props: ProgressBarProps): ReactElement {
	const percent = Math.round(Math.min(Math.max(props.value, 0), 1) * 100);

	return (
		<div
			role="progressbar"
			aria-label={props.label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent}
			className="cf:h-1.5 cf:w-full cf:overflow-hidden cf:rounded-full cf:bg-line"
		>
			<div className="cf:h-full cf:rounded-full cf:bg-brand" style={{ width: `${percent}%` }} />
		</div>
	);
}
