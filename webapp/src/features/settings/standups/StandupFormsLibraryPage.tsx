import type { ReactElement } from 'react';
import { FileQuestion, Plus } from 'lucide-react';

import { CampfireBidiText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfirePageIntro } from '@/components/campfire/CampfirePageIntro';
import { Button } from '@/components/ui/button';

import { formatLabel } from './standup-settings.helpers';
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
	return (
		<div className="campfire-standup-editor-stack">
			<CampfirePageIntro
				eyebrow="Standup forms"
				title="Choose one form to edit"
				description="Keep each template focused. Open a form, then edit its questions on a dedicated page."
				actions={(
					<Button type="button" disabled={!props.canManageStandups} onClick={props.onCreateTemplate}>
						<Plus className="cf:size-4" />
						New template
					</Button>
				)}
			/>

			<CampfireSurface className="campfire-standup-editor-surface">
				{props.templatesWithDrafts.length === 0 ? (
					<CampfireEmpty icon={FileQuestion} title="No templates yet" description="Create your first daily or weekly standup form." />
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
										{formatLabel(pair.template.kind)} · {pair.questions.length} questions · {pair.schedules.length} schedules
									</span>
								</span>

								<span className="campfire-standup-template-row-action">Open</span>
							</button>
						))}
					</div>
				)}
			</CampfireSurface>
		</div>
	);
}
