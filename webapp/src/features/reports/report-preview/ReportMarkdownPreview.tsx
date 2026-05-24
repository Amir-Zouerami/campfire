import type { ReactElement } from 'react';
import { Copy, FileText, Send } from 'lucide-react';
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
 * ReportMarkdownPreview renders report actions without showing the raw Markdown body.
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
		<section className="cf:flex cf:flex-wrap cf:items-center cf:justify-between cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:min-w-0 cf:items-center cf:gap-3">
				<div className="campfire-icon-tile cf:size-10 cf:rounded-xl">
					<FileText className="cf:size-4" />
				</div>

				<div className="cf:min-w-0">
					<p className="cf:m-0 cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Report actions
					</p>
					<h3 className="cf:m-0 cf:mt-1 cf:text-lg cf:font-black cf:tracking-[-0.02em] cf:text-foreground">
						{hasMarkdown ? 'Report is ready' : 'No report loaded yet'}
					</h3>
				</div>
			</div>

			<div className="cf:flex cf:flex-wrap cf:gap-2">
				<Button type="button" variant="secondary" disabled={actionDisabled} onClick={() => void handleCopy()}>
					<Copy className="cf:size-4" />
					Copy report
				</Button>

				<Button type="button" disabled={actionDisabled} onClick={() => void props.onPost()}>
					<Send className="cf:size-4" />
					Post to channel
				</Button>
			</div>
		</section>
	);
}
