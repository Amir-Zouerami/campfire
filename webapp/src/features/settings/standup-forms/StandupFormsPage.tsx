import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useStandupConfiguration } from '@/shared/data/standups';
import { useI18n } from '@/shared/i18n';
import { Button, Container, EmptyState, ListRow, ListRows, PageHeader, QueryView, Section, StatusText, Tag } from '@/shared/ui';

import { sortTemplates } from './standupForms';
import { TemplateDialog } from './TemplateDialog';
import { TemplateEditor } from './TemplateEditor';

/**
 * StandupFormsPage manages the workspace's standup templates, with their questions and
 * schedules. It shows the template list; opening a template shows its editor.
 */
export function StandupFormsPage(): ReactElement {
	const { t } = useI18n();
	const configuration = useStandupConfiguration({ includeInactive: true });
	const [openID, setOpenID] = useState('');
	const [creating, setCreating] = useState(false);

	return (
		<Container>
			<QueryView query={configuration} errorTitle={t('settings.standups.error.fallback')}>
				{config => {
					const template = config.templates.find(candidate => candidate.id === openID);

					if (template !== undefined) {
						return (
							<>
								<div>
									<Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setOpenID('')}>
										{t('settings.standups.actions.backToForms')}
									</Button>
								</div>
								<TemplateEditor
									key={`${template.id}:${template.updatedAt}`}
									template={template}
									templates={config.templates}
									questions={config.questions}
									schedules={config.schedules}
									onDeleted={() => setOpenID('')}
								/>
							</>
						);
					}

					return (
						<>
							<PageHeader
								eyebrow={t('settings.standups.forms.library.eyebrow')}
								title={t('settings.standups.forms.library.title')}
								description={t('settings.standups.forms.library.description')}
								actions={
									<Button icon={Plus} onClick={() => setCreating(true)}>
										{t('settings.standups.actions.newTemplate')}
									</Button>
								}
							/>
							<Section>
								{config.templates.length === 0 ? (
									<EmptyState
										title={t('settings.standups.forms.empty.title')}
										description={t('settings.standups.forms.empty.description')}
									/>
								) : (
									<ListRows label={t('settings.standups.forms.library.title')}>
										{sortTemplates(config.templates).map(item => {
											const questions = config.questions.filter(question => question.templateId === item.id).length;
											const schedules = config.schedules.filter(schedule => schedule.templateId === item.id).length;

											return (
												<ListRow
													key={item.id}
													title={<span dir="auto">{item.name}</span>}
													subtitle={`${t(`settings.standups.kind.${item.kind}`)} · ${questions === 1 ? t('settings.standups.count.question.one') : t('settings.standups.count.question.many', { count: questions })} · ${schedules === 1 ? t('settings.standups.count.schedule.one') : t('settings.standups.count.schedule.many', { count: schedules })}`}
													trailing={
														<>
															<StatusText kind={item.isActive ? 'approved' : 'inactive'}>
																{t(item.isActive ? 'settings.standups.status.enabled' : 'settings.standups.status.disabled')}
															</StatusText>
															<Tag>{t('settings.standups.actions.open')}</Tag>
														</>
													}
													onSelect={() => setOpenID(item.id)}
												/>
											);
										})}
									</ListRows>
								)}
							</Section>
							<TemplateDialog open={creating} onClose={() => setCreating(false)} templates={config.templates} onCreated={setOpenID} />
						</>
					);
				}}
			</QueryView>
		</Container>
	);
}
