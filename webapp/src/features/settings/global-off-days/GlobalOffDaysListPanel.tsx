import type { ReactElement } from 'react';
import { CalendarX2, Trash2 } from 'lucide-react';

import { CampfireBidiText, CampfireEllipsisText } from '@/components/campfire/CampfireBidiText';
import { CampfireEmpty } from '@/components/campfire/CampfireLayoutPrimitives';
import { CampfireSettingsPanel } from '@/components/campfire/CampfireSettingsPanel';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { sortByNewest } from '@/lib/sort';
import type { GlobalSkipDate } from '@/types/domain';

import { formatDateTime, globalOffDayIsPast } from './global-off-days.helpers';

/**
 * GlobalOffDaysListPanelProps contains global skip-date list state.
 */
type GlobalOffDaysListPanelProps = {
	readonly skipDates: readonly GlobalSkipDate[];
	readonly disabled: boolean;
	readonly isSystemAdmin: boolean;
	readonly deletingID: string;
	readonly onDelete: (skipDateID: string) => Promise<void>;
};

/**
 * GlobalOffDaysListPanel renders global off-days.
 */
export function GlobalOffDaysListPanel(props: GlobalOffDaysListPanelProps): ReactElement {
	const { htmlLang, t } = useI18n();
	const skipDates = sortByNewest(props.skipDates, skipDate => skipDate.date || skipDate.createdAt);

	return (
		<CampfireSettingsPanel
			eyebrow={t('settings.globalOffDays.list.eyebrow')}
			title={t('settings.globalOffDays.list.title')}
			description={t('settings.globalOffDays.list.description')}
		>
			{skipDates.length === 0 ? (
				<CampfireEmpty
					icon={CalendarX2}
					title={t('settings.globalOffDays.empty.title')}
					description={t('settings.globalOffDays.empty.description')}
				/>
			) : (
				<div className="campfire-settings-flat-list">
					{skipDates.map(skipDate => (
						<GlobalOffDayRow
							key={skipDate.id}
							skipDate={skipDate}
							disabled={props.disabled || !props.isSystemAdmin}
							deleting={props.deletingID === skipDate.id}
							locale={htmlLang}
							onDelete={() => props.onDelete(skipDate.id)}
						/>
					))}
				</div>
			)}
		</CampfireSettingsPanel>
	);
}

/**
 * GlobalOffDayRow renders one global skip date.
 */
function GlobalOffDayRow(props: {
	readonly skipDate: GlobalSkipDate;
	readonly disabled: boolean;
	readonly deleting: boolean;
	readonly locale: string;
	readonly onDelete: () => Promise<void>;
}): ReactElement {
	const { t } = useI18n();
	const isPast = globalOffDayIsPast(props.skipDate);

	return (
		<article className="campfire-settings-flat-row">
			<div className="campfire-settings-flat-row-main">
				<strong><CampfireEllipsisText value={props.skipDate.label} /></strong>
				<p>
					<CampfireBidiText>{props.skipDate.date}</CampfireBidiText>
					<span> · </span>
					<span>{isPast ? t('settings.globalOffDays.status.past') : t('settings.globalOffDays.status.upcoming')}</span>
					<span> · </span>
					<span>{t('settings.globalOffDays.created', { date: formatDateTime(props.skipDate.createdAt, props.locale) })}</span>
				</p>
			</div>

			<Button type="button" variant="destructive" disabled={props.disabled} onClick={() => void props.onDelete()}>
				<Trash2 className="cf:size-4" />
				{props.deleting ? t('settings.globalOffDays.deleting') : t('settings.globalOffDays.delete')}
			</Button>
		</article>
	);
}
