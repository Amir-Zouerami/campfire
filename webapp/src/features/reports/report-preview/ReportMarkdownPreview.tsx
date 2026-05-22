import type { ReactElement } from 'react';
import { Copy, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

import { CampfireEmpty } from '@/app/campfire-ui';
import { Button } from '@/components/ui/button';

/**
 * ReportMarkdownPreviewProps contains Markdown and preview actions.
 */
type ReportMarkdownPreviewProps = {
	readonly markdown: string;
	readonly disabled: boolean;
	readonly onPost: () => Promise<void>;
};

/**
 * ReportMarkdownPreview renders raw Markdown in a Mattermost-like preview surface.
 */
export function ReportMarkdownPreview(props: ReportMarkdownPreviewProps): ReactElement {
	/**
	 * handleCopy copies the current Markdown to the clipboard.
	 */
	async function handleCopy(): Promise<void> {
		if (props.markdown.trim() === '') {
			toast.error('There is no Markdown to copy');
			return;
		}

		try {
			await navigator.clipboard.writeText(props.markdown);
			toast.success('Markdown copied');
		} catch (_error: unknown) {
			toast.error('Could not copy Markdown');
		}
	}

	if (props.markdown.trim() === '') {
		return (
			<CampfireEmpty
				icon={FileText}
				title="No Markdown yet"
				description="Adjust the filters or wait for the preview to load."
			/>
		);
	}

	return (
		<section className="cf:grid cf:gap-4 cf:rounded-3xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
			<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
				<div>
					<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
						Markdown preview
					</p>
					<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
						Ready for Mattermost
					</h3>
				</div>

				<div className="cf:flex cf:flex-wrap cf:gap-2">
					<Button
						type="button"
						variant="secondary"
						disabled={props.disabled}
						onClick={() => void handleCopy()}
					>
						<Copy className="cf:size-4" />
						Copy
					</Button>

					<Button type="button" disabled={props.disabled} onClick={() => void props.onPost()}>
						<Send className="cf:size-4" />
						Post to channel
					</Button>
				</div>
			</div>

			<pre className="cf:max-h-[520px] cf:overflow-auto cf:whitespace-pre-wrap cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/30 cf:p-5 cf:text-sm cf:font-semibold cf:leading-7 cf:text-slate-200">
				{props.markdown}
			</pre>
		</section>
	);
}
