import type { ReactElement } from 'react';
import { Copy, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/**
 * ReportMarkdownPreviewProps contains Markdown and report actions.
 */
type ReportMarkdownPreviewProps = {
	readonly markdown: string;
	readonly disabled: boolean;
	readonly onPost: () => Promise<void>;
};

/**
 * ReportMarkdownPreview renders only report actions.
 */
export function ReportMarkdownPreview(props: ReportMarkdownPreviewProps): ReactElement {
	const hasMarkdown = props.markdown.trim() !== '';
	const actionDisabled = props.disabled || !hasMarkdown;

	/**
	 * handleCopy copies the current Markdown to the clipboard.
	 */
	async function handleCopy(): Promise<void> {
		if (!hasMarkdown) {
			toast.error('There is no report to copy');
			return;
		}

		try {
			await navigator.clipboard.writeText(props.markdown);
			toast.success('Report copied');
		} catch (_error: unknown) {
			toast.error('Could not copy report');
		}
	}

	return (
		<section className="cf:flex cf:flex-wrap cf:items-center cf:justify-end cf:gap-2 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4">
			<Button type="button" variant="secondary" disabled={actionDisabled} onClick={() => void handleCopy()}>
				<Copy className="cf:size-4" />
				Copy report
			</Button>

			<Button type="button" disabled={actionDisabled} onClick={() => void props.onPost()}>
				<Send className="cf:size-4" />
				Post to channel
			</Button>
		</section>
	);
}
