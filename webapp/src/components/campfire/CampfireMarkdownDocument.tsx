import type { ReactElement } from 'react';
import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { CampfireLoadingState } from '@/components/campfire/CampfireLoading';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { cn } from '@/lib/utils';

/**
 * CampfireMarkdownDocumentProps contains a trusted-by-Campfire Markdown string.
 */
type CampfireMarkdownDocumentProps = {
	readonly markdown: string;
	readonly className?: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly loading?: boolean;
	readonly loadingTitle?: string;
	readonly loadingDescription?: string;
};

/**
 * CampfireMarkdownDocument renders generated Markdown as readable HTML.
 *
 * User-authored HTML is intentionally not enabled. Campfire reports are Markdown
 * documents and React Markdown escapes raw HTML by default, keeping the preview
 * usable without widening the webapp attack surface.
 */
export function CampfireMarkdownDocument(props: CampfireMarkdownDocumentProps): ReactElement {
	const cleanMarkdown = props.markdown.trim();

	if (props.loading === true) {
		return (
			<div className={cn('campfire-report-preview-state campfire-report-preview-state--loading', props.className)}>
				<CampfireLoadingState
					title={props.loadingTitle ?? props.emptyTitle}
					description={props.loadingDescription ?? props.emptyDescription}
				/>
			</div>
		);
	}

	if (cleanMarkdown === '') {
		return (
			<div className={cn('campfire-report-preview-state campfire-report-preview-state--empty', props.className)}>
				<CampfireEmpty
					icon={FileText}
					title={props.emptyTitle}
					description={props.emptyDescription}
				/>
			</div>
		);
	}

	return (
		<div className={cn('campfire-markdown-document', props.className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown}</ReactMarkdown>
		</div>
	);
}
