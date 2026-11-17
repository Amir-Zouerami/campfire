import { Copy, Send } from 'lucide-react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, EmptyState, Inline, LoadingState, MarkdownDocument, Section, toast } from '@/shared/ui';

type ReportViewerProps = {
	readonly markdown: string | undefined;
	readonly loading: boolean;
	readonly posting: boolean;
	readonly canPost: boolean;
	readonly onPost: () => void;
};

/**
 * ReportViewer shows a generated report as rendered Markdown, with the two ways to share it:
 * copy the Markdown source, or post it to the workspace channel.
 */
export function ReportViewer(props: ReportViewerProps): ReactElement {
	const { t } = useI18n();

	async function copy(): Promise<void> {
		if (props.markdown === undefined || props.markdown.trim() === '') {
			toast.error(t('reports.preview.toast.noReportToCopy'));
			return;
		}

		try {
			await navigator.clipboard.writeText(props.markdown);
			toast.success(t('reports.preview.toast.copied'));
		} catch {
			toast.error(t('reports.preview.toast.copyFailed'));
		}
	}

	return (
		<Section
			divided
			eyebrow={t('reports.preview.markdown.eyebrow')}
			title={t('reports.preview.markdown.title')}
			actions={
				<Inline gap={2}>
					<Button variant="secondary" size="sm" icon={Copy} disabled={props.markdown === undefined} onClick={() => void copy()}>
						{t('reports.preview.action.copyMarkdown')}
					</Button>
					<Button
						size="sm"
						icon={Send}
						loading={props.posting}
						disabled={!props.canPost || props.markdown === undefined}
						onClick={props.onPost}
					>
						{t('reports.preview.action.postToChannel')}
					</Button>
				</Inline>
			}
		>
			{props.loading ? (
				<LoadingState title={t('reports.preview.markdown.loadingTitle')} description={t('reports.preview.markdown.loadingDescription')} />
			) : props.markdown === undefined || props.markdown.trim() === '' ? (
				<EmptyState title={t('reports.preview.markdown.emptyTitle')} description={t('reports.preview.markdown.emptyDescription')} />
			) : (
				<MarkdownDocument markdown={props.markdown} />
			)}
		</Section>
	);
}
