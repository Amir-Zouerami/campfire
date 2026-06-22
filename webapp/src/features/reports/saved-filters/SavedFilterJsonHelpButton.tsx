import { useState, type ReactElement } from 'react';
import { Info } from 'lucide-react';

import { CampfireInfoModal } from '@/components/campfire/CampfireInfoModal';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

/**
 * SavedFilterJsonHelpButton opens non-technical guidance for saved-filter JSON.
 */
export function SavedFilterJsonHelpButton(): ReactElement {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="secondary"
				size="xs"
				className="campfire-field-info-button"
				onClick={() => setOpen(true)}
			>
				<Info className="cf:size-4" />
				{t('reports.saved.help.action')}
			</Button>

			<CampfireInfoModal
				open={open}
				title={t('reports.saved.help.title')}
				description={t('reports.saved.help.description')}
				onClose={() => setOpen(false)}
			>
				<div className="campfire-json-help-grid">
					<HelpExample
						title={t('reports.saved.help.daily.title')}
						description={t('reports.saved.help.daily.description')}
						code={`{
  "occurrenceDate": "2026-06-04",
  "sortMode": "first_submitted"
}`}
					/>

					<HelpExample
						title={t('reports.saved.help.weekly.title')}
						description={t('reports.saved.help.weekly.description')}
						code={`{
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-07",
  "sortMode": "blockers_first"
}`}
					/>

					<HelpExample
						title={t('reports.saved.help.time.title')}
						description={t('reports.saved.help.time.description')}
						code={`{
  "startDate": "2026-05-21",
  "endDate": "2026-06-04",
  "groupBy": "person"
}`}
					/>

					<HelpExample
						title={t('reports.saved.help.missing.title')}
						description={t('reports.saved.help.missing.description')}
						code={`{
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "sortMode": "missing_first"
}`}
					/>

					<HelpExample
						title={t('reports.saved.help.blockers.title')}
						description={t('reports.saved.help.blockers.description')}
						code={`{
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "sortMode": "blockers_first",
  "includeBlockers": true
}`}
					/>
				</div>
			</CampfireInfoModal>
		</>
	);
}

/**
 * HelpExample renders one copyable saved-filter JSON example.
 */
function HelpExample(props: {
	readonly title: string;
	readonly description: string;
	readonly code: string;
}): ReactElement {
	return (
		<article className="campfire-json-help-example">
			<h4>{props.title}</h4>
			<p>{props.description}</p>
			<pre>
				<code>{props.code}</code>
			</pre>
		</article>
	);
}
