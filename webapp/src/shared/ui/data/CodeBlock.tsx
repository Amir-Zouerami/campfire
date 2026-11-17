import type { ReactElement } from 'react';

type CodeBlockProps = {
	readonly children: string;
};

/**
 * CodeBlock shows a short snippet (JSON, a command) in a scrollable, always left-to-right box.
 */
export function CodeBlock(props: CodeBlockProps): ReactElement {
	return (
		<pre
			dir="ltr"
			className="cf:m-0 cf:overflow-x-auto cf:rounded-control cf:bg-sunken cf:p-3 cf:text-start cf:text-[12.5px] cf:leading-relaxed cf:text-ink"
		>
			{props.children}
		</pre>
	);
}
