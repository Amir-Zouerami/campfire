import type { ReactElement } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownDocumentProps = {
	readonly markdown: string;
};

/**
 * MarkdownDocument renders generated report Markdown. Links open in a new tab with a safe
 * `rel`, and element styles are explicit because Campfire never relies on global CSS.
 */
export function MarkdownDocument(props: MarkdownDocumentProps): ReactElement {
	return (
		<div className="cf:max-w-none cf:text-sm cf:leading-7 cf:text-ink" dir="auto">
			<Markdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => <h2 className="cf:mt-6 cf:mb-3 cf:text-xl cf:font-extrabold">{children}</h2>,
					h2: ({ children }) => <h3 className="cf:mt-5 cf:mb-2 cf:text-base cf:font-extrabold">{children}</h3>,
					h3: ({ children }) => <h4 className="cf:mt-4 cf:mb-1.5 cf:text-sm cf:font-bold">{children}</h4>,
					p: ({ children }) => <p className="cf:my-2">{children}</p>,
					ul: ({ children }) => <ul className="cf:my-2 cf:list-disc cf:ps-6">{children}</ul>,
					ol: ({ children }) => <ol className="cf:my-2 cf:list-decimal cf:ps-6">{children}</ol>,
					li: ({ children }) => <li className="cf:my-0.5">{children}</li>,
					blockquote: ({ children }) => (
						<blockquote className="cf:my-3 cf:border-s-2 cf:border-line-strong cf:ps-4 cf:text-muted">{children}</blockquote>
					),
					hr: () => <hr className="cf:my-5 cf:h-px cf:border-0 cf:bg-line" />,
					strong: ({ children }) => <strong className="cf:font-bold">{children}</strong>,
					code: ({ children }) => <code className="cf:rounded cf:bg-sunken cf:px-1 cf:py-0.5 cf:text-[0.85em]">{children}</code>,
					a: ({ href, children }) => (
						<a href={href} target="_blank" rel="noopener noreferrer" className="cf:font-semibold cf:text-blue-ink cf:underline">
							{children}
						</a>
					),
					table: ({ children }) => (
						<div className="cf:my-3 cf:overflow-x-auto">
							<table className="cf:w-full cf:border-collapse cf:text-sm">{children}</table>
						</div>
					),
					th: ({ children }) => (
						<th className="cf:border-b cf:border-line-strong cf:px-3 cf:py-2 cf:text-start cf:font-bold">{children}</th>
					),
					td: ({ children }) => <td className="cf:border-b cf:border-line cf:px-3 cf:py-2">{children}</td>,
				}}
			>
				{props.markdown}
			</Markdown>
		</div>
	);
}
