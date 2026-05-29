import type { ReactElement } from 'react';
import { ClipboardList, FileQuestion } from 'lucide-react';

import { CampfireStatusPill, CampfireSurface } from '@/components/campfire/CampfireLayoutPrimitives';

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
		<CampfireSurface className="campfire-standup-overview-surface">
			<div className="campfire-surface-header campfire-surface-header--with-action">
				<div>
					<p className="campfire-surface-eyebrow">Overview</p>
					<h3 className="campfire-surface-title">Current standup setup</h3>
					<p className="campfire-surface-description">
						Templates, attached questions, and schedules in one scan-friendly view.
					</p>
				</div>
				<CampfireStatusPill tone="ember">{props.templateDetails.length} templates</CampfireStatusPill>
			</div>

			{props.templateDetails.length === 0 && (
				<div className="campfire-flat-empty-state">
					<span className="campfire-flat-empty-icon" aria-hidden="true">
						<ClipboardList className="cf:size-5" />
					</span>
					<div>
						<h4>No standup templates yet</h4>
						<p>Create a daily or weekly template, then attach schedules and questions.</p>
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
										<h4>{detail.template.name}</h4>
										<CampfireStatusPill tone={detail.template.isActive ? 'green' : 'slate'}>
											{detail.template.isActive ? 'Active' : 'Inactive'}
										</CampfireStatusPill>
										<CampfireStatusPill tone="ember">{formatLabel(detail.template.kind)}</CampfireStatusPill>
									</div>

									{detail.template.description.trim() !== '' && (
										<p className="campfire-standup-overview-description">{detail.template.description}</p>
									)}
								</div>
							</div>

							<div className="campfire-standup-overview-meta">
								<span>{detail.questions.length} questions</span>
								<span>{detail.schedules.length} schedules</span>
							</div>

							{detail.questions.length > 0 && (
								<div className="campfire-standup-question-chip-list">
									{detail.questions.slice(0, 6).map(question => (
										<span key={question.id}>{question.label}</span>
									))}

									{detail.questions.length > 6 && <span>+{detail.questions.length - 6} more</span>}
								</div>
							)}
						</article>
					))}
				</div>
			)}
		</CampfireSurface>
	);
}
