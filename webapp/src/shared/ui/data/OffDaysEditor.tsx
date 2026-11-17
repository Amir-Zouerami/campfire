import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { sortByNewest } from '@/shared/lib/sort';

import { Field } from '../forms/Field';
import { DateField } from '../forms/DateField';
import { TextInput } from '../forms/TextInput';
import { EmptyState } from '../feedback/states';
import { Grid } from '../layout/Grid';
import { Section } from '../layout/Section';
import { Stack } from '../layout/Stack';
import { Button } from '../primitives/Button';
import { IconButton } from '../primitives/IconButton';
import { Tag } from '../primitives/Tag';
import { ListRow, ListRows } from './ListRow';

export type OffDay = {
	readonly id: string;
	readonly date: string;
	readonly label: string;
	readonly createdAt: string;
};

export type OffDaysLabels = {
	readonly createEyebrow: string;
	readonly createTitle: string;
	readonly createDescription: string;
	readonly dateLabel: string;
	readonly nameLabel: string;
	readonly namePlaceholder: string;
	readonly addAction: string;
	readonly listEyebrow: string;
	readonly listTitle: string;
	readonly listDescription: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly past: string;
	readonly upcoming: string;
	readonly created: (date: string) => string;
	readonly deleteAction: string;
	readonly dateRequired: string;
	readonly nameRequired: string;
};

type OffDaysEditorProps = {
	readonly days: readonly OffDay[];
	readonly today: string;
	/** When false the list is read-only and the create form is hidden. */
	readonly canEdit: boolean;
	readonly labels: OffDaysLabels;
	readonly onCreate: (date: string, label: string) => Promise<unknown>;
	readonly onDelete: (id: string) => Promise<unknown>;
};

/**
 * OffDaysEditor lists skip dates (holidays) and adds new ones. The workspace calendar and the
 * organization-wide calendar are the same task with different data, so they share this editor.
 */
export function OffDaysEditor(props: OffDaysEditorProps): ReactElement {
	const { formatTimestamp } = useI18n();
	const { labels } = props;
	const [date, setDate] = useState(props.today);
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState('');

	async function create(): Promise<void> {
		if (date.trim() === '') {
			setError(labels.dateRequired);
			return;
		}

		if (name.trim() === '') {
			setError(labels.nameRequired);
			return;
		}

		setError('');
		setBusy('create');
		try {
			await props.onCreate(date.trim(), name.trim());
			setName('');
		} finally {
			setBusy('');
		}
	}

	async function remove(id: string): Promise<void> {
		setBusy(id);
		try {
			await props.onDelete(id);
		} finally {
			setBusy('');
		}
	}

	const days = sortByNewest(props.days, day => day.date || day.createdAt);

	return (
		<Stack gap={10}>
			{props.canEdit && (
				<Section eyebrow={labels.createEyebrow} title={labels.createTitle} description={labels.createDescription}>
					<form
						noValidate
						onSubmit={event => {
							event.preventDefault();
							void create();
						}}
					>
						<Stack gap={4}>
							<Grid columns={2}>
								<Field label={labels.dateLabel} error={error === labels.dateRequired ? error : undefined}>
									<DateField value={date} onChange={setDate} />
								</Field>
								<Field label={labels.nameLabel} error={error === labels.nameRequired ? error : undefined}>
									<TextInput value={name} onChange={setName} placeholder={labels.namePlaceholder} />
								</Field>
							</Grid>
							<div>
								<Button type="submit" icon={Plus} loading={busy === 'create'}>
									{labels.addAction}
								</Button>
							</div>
						</Stack>
					</form>
				</Section>
			)}

			<Section divided eyebrow={labels.listEyebrow} title={labels.listTitle} description={labels.listDescription}>
				{days.length === 0 ? (
					<EmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
				) : (
					<ListRows label={labels.listTitle}>
						{days.map(day => (
							<ListRow
								key={day.id}
								title={<span dir="auto">{day.label}</span>}
								subtitle={`${day.date} · ${labels.created(formatTimestamp(day.createdAt))}`}
								trailing={
									<>
										<Tag tone={day.date < props.today ? 'neutral' : 'blue'}>{day.date < props.today ? labels.past : labels.upcoming}</Tag>
										{props.canEdit && (
											<IconButton
												icon={Trash2}
												variant="ghost"
												label={labels.deleteAction}
												disabled={busy === day.id}
												onClick={() => void remove(day.id)}
											/>
										)}
									</>
								}
							/>
						))}
					</ListRows>
				)}
			</Section>
		</Stack>
	);
}
