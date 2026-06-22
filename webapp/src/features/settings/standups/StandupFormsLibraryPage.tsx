import type { ReactElement } from 'react';
import { FileQuestion, Plus } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

import { countLabel, standupKindLabel } from './standup-settings.i18n';
import type { StandupTemplateWithDraft } from './standup-settings.types';

/**
 * StandupFormsLibraryPageProps contains the template directory state.
 */
type StandupFormsLibraryPageProps = {
	readonly templatesWithDrafts: readonly StandupTemplateWithDraft[];
	readonly canManageStandups: boolean;
	readonly onSelectTemplate: (templateID: string) => void;
	readonly onCreateTemplate: () => void;
};

/**
 * StandupFormsLibraryPage renders the dedicated standup form directory.
 */
export function StandupFormsLibraryPage(props: StandupFormsLibraryPageProps): ReactElement {
	const { t } = useI18n();

	return (
		<div className="campfire-standup-editor-stack">
			<CampfirePageIntro
				eyebrow={t('settings.standups.forms.library.eyebrow')}
				title={t('settings.standups.forms.library.title')}
				description={t('settings.standups.forms.library.description')}
				actions={(
					<Button type="button" disabled={!props.canManageStandups} onClick={props.onCreateTemplate}>
						<Plus className="cf:size-4" />
						{t('settings.standups.actions.newTemplate')}
					</Button>
				)}
			/>

			<CampfireSurface className="campfire-standup-editor-surface">
				{props.templatesWithDrafts.length === 0 ? (
					<CampfireEmpty icon={FileQuestion} title={t('settings.standups.forms.empty.title')} description={t('settings.standups.forms.empty.description')} />
				) : (
					<div className="campfire-standup-template-directory" role="list">
						{props.templatesWithDrafts.map(pair => (
							<button
								key={pair.template.id}
								type="button"
								className="campfire-standup-template-row"
								onClick={() => props.onSelectTemplate(pair.template.id)}
							>
								<span className="campfire-standup-template-row-main">
									<CampfireBidiText className="campfire-standup-template-row-title">{pair.template.name}</CampfireBidiText>
									<span className="campfire-standup-template-row-meta">
										{standupKindLabel(t, pair.template.kind)} · {countLabel(t, pair.questions.length, 'settings.standups.count.question.one', 'settings.standups.count.question.many')} · {countLabel(t, pair.schedules.length, 'settings.standups.count.schedule.one', 'settings.standups.count.schedule.many')}
									</span>
								</span>

								<span className="campfire-standup-template-row-action">{t('settings.standups.actions.open')}</span>
							</button>
						))}
					</div>
				)}
			</CampfireSurface>
		</div>
	);
}
