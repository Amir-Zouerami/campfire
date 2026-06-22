import type { ReactElement } from 'react';
import { ClipboardList, FileQuestion } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { useI18n } from '@/i18n';
import { CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

import { countLabel, standupKindLabel } from './standup-settings.i18n';
import type { StandupTemplateWithDetails } from './standup-settings.types';

/**
 * StandupConfigurationOverviewPanelProps contains compact template overview data.
 */
type StandupConfigurationOverviewPanelProps = {
	readonly templateDetails: readonly StandupTemplateWithDetails[];
};

/**
 * StandupConfigurationOverviewPanel renders a compact read-only standup overview.
 */
export function StandupConfigurationOverviewPanel(props: StandupConfigurationOverviewPanelProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-page-stack campfire-standup-overview-stack">
			<CampfirePageIntro
				eyebrow={t('settings.standups.overview.eyebrow')}
				title={t('settings.standups.overview.title')}
				description={t('settings.standups.overview.description')}
				actions={
					<CampfireStatusPill tone="ember">
						{countLabel(t, props.templateDetails.length, 'settings.standups.count.template.one', 'settings.standups.count.template.many')}
					</CampfireStatusPill>
				}
			/>

			<CampfireSurface className="campfire-standup-overview-surface">
			{props.templateDetails.length === 0 && (
				<div className="campfire-flat-empty-state">
					<span className="campfire-flat-empty-icon" aria-hidden="true">
						<ClipboardList className="cf:size-5" />
					</span>
					<div>
						<h4>{t('settings.standups.overview.empty.title')}</h4>
						<p>{t('settings.standups.overview.empty.description')}</p>
					</div>
				</div>
			)}

			{props.templateDetails.length > 0 && (
				<div className="campfire-standup-overview-list">
					{props.templateDetails.map(detail => (
						<article key={detail.template.id} className="campfire-standup-overview-row">
							<div className="campfire-standup-overview-main">
								<span className="campfire-standup-overview-icon" aria-hidden="true">
									<FileQuestion className="cf:size-4" />
								</span>

								<div className="cf:min-w-0">
									<div className="campfire-standup-overview-title-row">
										<h4><CampfireBidiText>{detail.template.name}</CampfireBidiText></h4>
										<CampfireStatusPill tone={detail.template.isActive ? 'green' : 'slate'}>
											{detail.template.isActive ? t('settings.standups.status.active') : t('settings.standups.status.inactive')}
										</CampfireStatusPill>
										<CampfireStatusPill tone="ember">{standupKindLabel(t, detail.template.kind)}</CampfireStatusPill>
									</div>

									{detail.template.description.trim() !== '' && (
										<p className="campfire-standup-overview-description"><CampfireBidiText>{detail.template.description}</CampfireBidiText></p>
									)}
								</div>
							</div>

							<div className="campfire-standup-overview-meta">
								<span>{countLabel(t, detail.questions.length, 'settings.standups.count.question.one', 'settings.standups.count.question.many')}</span>
								<span>{countLabel(t, detail.schedules.length, 'settings.standups.count.schedule.one', 'settings.standups.count.schedule.many')}</span>
							</div>

							{detail.questions.length > 0 && (
								<div className="campfire-standup-question-chip-list">
									{detail.questions.slice(0, 6).map(question => (
										<span key={question.id}><CampfireBidiText>{question.label}</CampfireBidiText></span>
									))}

									{detail.questions.length > 6 && <span>{t('settings.standups.overview.moreQuestions', { count: String(detail.questions.length - 6) })}</span>}
								</div>
							)}
						</article>
					))}
				</div>
			)}
			</CampfireSurface>
		</div>
	);
}
