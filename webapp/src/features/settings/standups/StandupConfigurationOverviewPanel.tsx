import type { ReactElement } from 'react';
import { ClipboardList } from 'lucide-react';

import {
	CampfireCardBody,
	CampfireCardHeader,
	CampfireEmpty,
	CampfirePanel,
	CampfireStatusPill,
} from '@/app/campfire-ui';

import { formatLabel } from './standup-settings.helpers';
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
	return (
		<CampfirePanel>
			<CampfireCardHeader
				eyebrow="Overview"
				title="Current standup setup"
				description="A compact map of templates, attached questions, and active schedules."
				icon={ClipboardList}
			/>

			<CampfireCardBody>
				{props.templateDetails.length === 0 && (
					<CampfireEmpty
						icon={ClipboardList}
						title="No standup templates yet"
						description="Create a daily or weekly template below, then attach schedules and questions."
					/>
				)}

				{props.templateDetails.length > 0 && (
					<div className="cf:grid cf:gap-3">
						{props.templateDetails.map(detail => (
							<article
								key={detail.template.id}
								className="cf:grid cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-4"
							>
								<div className="cf:flex cf:flex-wrap cf:items-start cf:justify-between cf:gap-3">
									<div className="cf:min-w-0">
										<div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
											<h3 className="cf:m-0 cf:text-lg cf:font-black cf:text-foreground">
												{detail.template.name}
											</h3>
											<CampfireStatusPill tone={detail.template.isActive ? 'green' : 'slate'}>
												{detail.template.isActive ? 'Active' : 'Inactive'}
											</CampfireStatusPill>
											<CampfireStatusPill tone="ember">
												{formatLabel(detail.template.kind)}
											</CampfireStatusPill>
										</div>

										{detail.template.description !== '' && (
											<p className="cf:m-0 cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
												{detail.template.description}
											</p>
										)}
									</div>

									<div className="cf:flex cf:flex-wrap cf:gap-2">
										<CampfireStatusPill tone="slate">
											{detail.questions.length} questions
										</CampfireStatusPill>
										<CampfireStatusPill tone="slate">
											{detail.schedules.length} schedules
										</CampfireStatusPill>
									</div>
								</div>

								<div className="cf:flex cf:flex-wrap cf:gap-2">
									{detail.questions.slice(0, 6).map(question => (
										<span
											key={question.id}
											className="cf:rounded-full cf:border cf:border-white/10 cf:bg-black/20 cf:px-3 cf:py-1.5 cf:text-xs cf:font-black cf:text-muted-foreground"
										>
											{question.label}
										</span>
									))}

									{detail.questions.length > 6 && (
										<span className="cf:rounded-full cf:border cf:border-amber-300/20 cf:bg-amber-300/10 cf:px-3 cf:py-1.5 cf:text-xs cf:font-black cf:text-amber-100">
											+{detail.questions.length - 6} more
										</span>
									)}
								</div>
							</article>
						))}
					</div>
				)}
			</CampfireCardBody>
		</CampfirePanel>
	);
}
