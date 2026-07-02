import type { ReactElement } from 'react';
import { Copy, Send } from 'lucide-react';
import { toast } from '@/components/campfire/campfire-toast';

import { CampfireMarkdownDocument } from '@/components/campfire/CampfireMarkdownDocument';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

/**
 * ReportMarkdownPreviewProps contains Markdown and report actions.
 */
type ReportMarkdownPreviewProps = {
	readonly markdown: string;
	readonly disabled: boolean;
	readonly loading: boolean;
	readonly onPost: () => Promise<void>;
};

/**
 * ReportMarkdownPreview renders generated reports as Markdown documents.
 *
 * The visible preview is rendered for humans, while the copy action preserves
 * the raw Markdown because that is still the channel payload Campfire posts.
 */
export function ReportMarkdownPreview(props: ReportMarkdownPreviewProps): ReactElement {
	const { t } = useI18n();
	const hasMarkdown = props.markdown.trim() !== '';
	const actionDisabled = props.disabled || props.loading || !hasMarkdown;

	/**
	 * handleCopy copies the current Markdown to the clipboard.
	 */
	async function handleCopy(): Promise<void> {
		if (!hasMarkdown) {
			toast.error(t('reports.preview.toast.noReportToCopy'));
			return;
		}

		try {
			await navigator.clipboard.writeText(props.markdown);
			toast.success(t('reports.preview.toast.copied'));
		} catch (_error: unknown) {
			toast.error(t('reports.preview.toast.copyFailed'));
		}
	}

	return (
		<section className="campfire-report-preview-layout">
			<div className="campfire-report-preview-panel">
				<header className="campfire-flat-section-header">
					<div>
						<p className="campfire-page-eyebrow">{t('reports.preview.markdown.eyebrow')}</p>
						<h3 className="campfire-surface-title">{t('reports.preview.markdown.title')}</h3>
					</div>
				</header>

				<CampfireMarkdownDocument
					markdown={props.markdown}
					loading={props.loading}
					emptyTitle={t('reports.preview.markdown.emptyTitle')}
					emptyDescription={t('reports.preview.markdown.emptyDescription')}
					loadingTitle={t('reports.preview.markdown.loadingTitle')}
					loadingDescription={t('reports.preview.markdown.loadingDescription')}
				/>
			</div>

			<aside className="campfire-report-action-rail" aria-label={t('reports.preview.actions.ariaLabel')}>
				<div>
					<p className="campfire-page-eyebrow">{t('reports.preview.actions.eyebrow')}</p>
					<h3 className="campfire-surface-title">{t('reports.preview.actions.title')}</h3>
					<p className="campfire-muted-copy">{t('reports.preview.actions.description')}</p>
				</div>

				<div className="campfire-report-action-buttons">
					<Button type="button" variant="secondary" disabled={actionDisabled} onClick={() => void handleCopy()}>
						<Copy className="cf:size-4" />
						{t('reports.preview.action.copyMarkdown')}
					</Button>

					<Button type="button" disabled={actionDisabled} onClick={() => void props.onPost()}>
						<Send className="cf:size-4" />
						{t('reports.preview.action.postToChannel')}
					</Button>
				</div>
			</aside>
		</section>
	);
}
