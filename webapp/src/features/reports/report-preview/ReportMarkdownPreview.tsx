import type { ReactElement } from 'react';
import { Copy, FileText, Send } from 'lucide-react';
import { toast } from '@/components/campfire/campfire-toast';

import { Button } from '@/components/ui/button';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';

/**
 * ReportMarkdownPreviewProps contains Markdown and report actions.
 */
type ReportMarkdownPreviewProps = {
	readonly markdown: string;
	readonly disabled: boolean;
	readonly onPost: () => Promise<void>;
};

/**
 * ReportMarkdownPreview renders the generated Markdown and its actions.
 *
 * The preview and action rail are intentionally one reusable component so daily
 * and weekly reports keep the same flat visual rhythm and do not rebuild their
 * own nested action cards.
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
		<section className="campfire-report-preview-layout">
			<div className="campfire-report-preview-panel">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">Markdown preview</p>
						<h3 className="campfire-surface-title">Generated report</h3>
					</div>
				</header>

				{hasMarkdown ? (
					<pre className="campfire-report-markdown-pre" aria-label="Generated Markdown report">
						{props.markdown}
					</pre>
				) : (
					<CampfireEmpty
						icon={FileText}
						title="No report preview"
						description="Adjust the report filters or wait for Campfire to load the generated Markdown."
					/>
				)}
			</div>

			<aside className="campfire-report-action-rail" aria-label="Report actions">
				<div>
					<p className="campfire-page-eyebrow">Actions</p>
					<h3 className="campfire-surface-title">Share</h3>
					<p className="campfire-muted-copy">Copy the Markdown or post the approved preview to the workspace channel.</p>
				</div>

				<div className="campfire-report-action-buttons">
					<Button type="button" variant="secondary" disabled={actionDisabled} onClick={() => void handleCopy()}>
						<Copy className="cf:size-4" />
						Copy report
					</Button>

					<Button type="button" disabled={actionDisabled} onClick={() => void props.onPost()}>
						<Send className="cf:size-4" />
						Post to channel
					</Button>
				</div>
			</aside>
		</section>
	);
}
