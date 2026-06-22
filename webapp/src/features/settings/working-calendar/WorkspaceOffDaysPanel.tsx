import type { ReactElement } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';

import { CampfireBidiText, CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { WorkspaceOffDay } from '@/types/domain';

import { formatDateTime, workspaceOffDayIsPast } from './working-calendar.helpers';

/**
 * WorkspaceOffDaysPanelProps contains workspace off-day list state.
 */
type WorkspaceOffDaysPanelProps = {
	readonly offDays: readonly WorkspaceOffDay[];
	readonly disabled: boolean;
	readonly canManageCalendar: boolean;
	readonly deletingOffDayID: string;
	readonly onDelete: (offDayID: string) => Promise<void>;
};

/**
 * WorkspaceOffDaysPanel renders workspace off-days.
 */
export function WorkspaceOffDaysPanel(props: WorkspaceOffDaysPanelProps): ReactElement {
	const { htmlLang, t } = useI18n();
	const offDays = sortByNewest(props.offDays, offDay => offDay.date || offDay.createdAt);

	return (
		<CampfireSettingsPanel
			eyebrow={t('settings.workingCalendar.offDays.eyebrow')}
			title={t('settings.workingCalendar.offDays.title')}
			description={t('settings.workingCalendar.offDays.description')}
		>
			{offDays.length === 0 ? (
				<CampfireEmpty
					icon={CalendarX2}
					title={t('settings.workingCalendar.offDays.empty.title')}
					description={t('settings.workingCalendar.offDays.empty.description')}
				/>
			) : (
				<div className="campfire-settings-flat-list">
					{offDays.map(offDay => (
						<WorkspaceOffDayRow
							key={offDay.id}
							offDay={offDay}
							disabled={props.disabled || !props.canManageCalendar}
							deleting={props.deletingOffDayID === offDay.id}
							locale={htmlLang}
							onDelete={() => props.onDelete(offDay.id)}
						/>
					))}
				</div>
			)}
		</CampfireSettingsPanel>
	);
}

/**
 * WorkspaceOffDayRow renders one workspace off-day row.
 */
function WorkspaceOffDayRow(props: {
	readonly offDay: WorkspaceOffDay;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly locale: string;
	readonly onDelete: () => Promise<void>;
}): ReactElement {
	const { t } = useI18n();
	const isPast = workspaceOffDayIsPast(props.offDay);

	return (
		<article className="campfire-settings-flat-row">
			<div className="campfire-settings-flat-row-main">
				<strong><CampfireEllipsisText value={props.offDay.label} /></strong>
				<p>
					<CampfireBidiText>{props.offDay.date}</CampfireBidiText>
					<span> · </span>
					<span>{isPast ? t('settings.workingCalendar.offDays.status.past') : t('settings.workingCalendar.offDays.status.upcoming')}</span>
					<span> · </span>
					<span>{t('settings.workingCalendar.offDays.created', { date: formatDateTime(props.offDay.createdAt, props.locale) })}</span>
				</p>
			</div>

			<Button type="button" variant="destructive" disabled={props.disabled} onClick={() => void props.onDelete()}>
				<Trash2 className="cf:size-4" />
				{props.deleting ? t('settings.workingCalendar.offDays.deleting') : t('settings.workingCalendar.offDays.delete')}
			</Button>
		</article>
	);
}
