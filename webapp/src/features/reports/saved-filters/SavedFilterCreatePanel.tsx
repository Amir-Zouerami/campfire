import type { FormEvent, ReactElement } from 'react';
import { Plus } from 'lucide-react';

import { CampfireField } from '@/components/campfire/CampfireField';
import { CampfireSelect } from '@/components/campfire/CampfireSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { formatReportKind, savedFilterReportKinds, toReportKind } from './saved-filters.helpers';
import type { SavedFilterDraft, SavedFilterDraftPatch } from './saved-filters.types';

/**
 * SavedFilterCreatePanelProps contains saved-filter form state and actions.
 */
type SavedFilterCreatePanelProps = {
	readonly draft: SavedFilterDraft;
	readonly disabled: boolean;
	readonly onChange: (patch: SavedFilterDraftPatch) => void;
	readonly onCreate: () => Promise<void>;
};

/**
 * SavedFilterCreatePanel renders the create saved-filter form.
 */
export function SavedFilterCreatePanel(props: SavedFilterCreatePanelProps): ReactElement {
	/**
	 * handleSubmit creates a saved filter.
	 */
	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault();
		void props.onCreate();
	}

	return (
		<form
			className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5"
			onSubmit={handleSubmit}
		>
			<div>
				<p className="cf:text-sm cf:font-black cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
					Create filter
				</p>
				<h3 className="cf:mt-1 cf:text-xl cf:font-black cf:tracking-[-0.03em] cf:text-foreground">
					Save a report view
				</h3>
			</div>

			<div className="cf:grid cf:gap-4">
				<CampfireField id="campfire-saved-filter-name" label="Name">
					<Input
						id="campfire-saved-filter-name"
						disabled={props.disabled}
						placeholder="Daily missing-first review"
						value={props.draft.name}
						onChange={event => props.onChange({ name: event.currentTarget.value })}
					/>
				</CampfireField>

				<CampfireField id="campfire-saved-filter-type" label="Report type">
					<CampfireSelect
						id="campfire-saved-filter-type"
						disabled={props.disabled}
						value={props.draft.reportType}
						onValueChange={value => props.onChange({ reportType: toReportKind(value) })}
					>
						{savedFilterReportKinds.map(reportKind => (
							<option key={reportKind} value={reportKind}>
								{formatReportKind(reportKind)}
							</option>
						))}
					</CampfireSelect>
				</CampfireField>

				<CampfireField
					id="campfire-saved-filter-json"
					label="Filter JSON"
					description="The JSON is intentionally visible for MVP. Later we can add a guided builder for each report type."
				>
					<Textarea
						id="campfire-saved-filter-json"
						disabled={props.disabled}
						value={props.draft.filterJson}
						onChange={event => props.onChange({ filterJson: event.currentTarget.value })}
					/>
				</CampfireField>
			</div>

			<div className="cf:flex cf:justify-end">
				<Button type="submit" disabled={props.disabled}>
					<Plus className="cf:size-4" />
					Save filter
				</Button>
			</div>
		</form>
	);
}
