import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, X } from 'lucide-react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

import { Text } from '../layout/Text';
import { usePortalContainer } from '../overlay/PortalContainer';
import { Avatar } from '../primitives/Avatar';
import { Icon } from '../primitives/Icon';
import { CONTROL_CLASS, POPUP_CLASS } from './controlStyles';
import { useFieldControl } from './Field';

/**
 * ComboboxOption is one searchable choice.
 */
export type ComboboxOption = {
	readonly value: string;
	readonly label: string;
	readonly description?: string;
	/** When set, the option shows this Mattermost user's avatar. */
	readonly avatarUserID?: string;
};

type CommonProps = {
	readonly options: readonly ComboboxOption[];
	readonly placeholder?: string;
	/** Text shown when no option matches. */
	readonly emptyText: string;
	readonly loading?: boolean;
	/** Provide for remote search; the list is then not filtered locally. */
	readonly onSearch?: (term: string) => void;
	readonly disabled?: boolean;
	readonly label?: string;
	readonly onBlur?: () => void;
};

type ComboboxProps = CommonProps & {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly clearable?: boolean;
	/** Used to render the current value while it is absent from `options` (e.g. mid remote search). */
	readonly selectedOption?: ComboboxOption;
};

/**
 * Combobox is a searchable single-choice picker (people, channels, tasks).
 */
export function Combobox(props: ComboboxProps): ReactElement {
	const { t } = useI18n();
	const control = useFieldControl();
	const selected = props.options.find(option => option.value === props.value) ?? props.selectedOption ?? null;
	const items =
		selected !== null && !props.options.some(option => option.value === selected.value) ? [...props.options, selected] : props.options;

	return (
		<BaseCombobox.Root
			items={items}
			value={selected}
			disabled={props.disabled}
			filter={props.onSearch === undefined ? undefined : null}
			itemToStringLabel={(option: ComboboxOption) => option.label}
			isItemEqualToValue={(first: ComboboxOption, second: ComboboxOption) => first.value === second.value}
			onValueChange={(next: ComboboxOption | null) => props.onChange(next?.value ?? '')}
			onInputValueChange={(term, details) => {
				if (props.onSearch !== undefined && details.reason === 'input-change') {
					props.onSearch(term);
				}
			}}
		>
			<BaseCombobox.InputGroup className={cn(CONTROL_CLASS, 'cf:flex cf:h-11 cf:items-center cf:gap-1 cf:p-0 cf:ps-3.5 cf:pe-1')}>
				<BaseCombobox.Input
					id={control.id}
					aria-describedby={control['aria-describedby']}
					aria-invalid={control['aria-invalid']}
					aria-label={props.label}
					placeholder={props.placeholder}
					onBlur={props.onBlur}
					className="cf:h-full cf:min-w-0 cf:flex-1 cf:border-0 cf:bg-transparent cf:p-0 cf:text-sm cf:text-ink cf:outline-none cf:placeholder:text-subtle"
				/>
				{props.clearable === true && selected !== null && (
					<BaseCombobox.Clear
						aria-label={t('common.clear')}
						className="cf:m-0 cf:grid cf:size-8 cf:cursor-pointer cf:appearance-none cf:place-items-center cf:rounded-md cf:border-0 cf:bg-transparent cf:p-0 cf:text-muted cf:hover:bg-sunken"
					>
						<Icon icon={X} size="sm" />
					</BaseCombobox.Clear>
				)}
				<BaseCombobox.Trigger className="cf:m-0 cf:grid cf:size-8 cf:cursor-pointer cf:appearance-none cf:place-items-center cf:rounded-md cf:border-0 cf:bg-transparent cf:p-0 cf:text-muted cf:hover:bg-sunken">
					<Icon icon={ChevronDown} size="sm" />
				</BaseCombobox.Trigger>
			</BaseCombobox.InputGroup>
			<ComboboxPopup loading={props.loading === true} emptyText={props.emptyText} />
		</BaseCombobox.Root>
	);
}

type MultiComboboxProps = CommonProps & {
	readonly value: readonly string[];
	readonly onChange: (value: readonly string[]) => void;
	/** Used to render selected values that are absent from `options`. */
	readonly selectedOptions?: readonly ComboboxOption[];
};

/**
 * MultiCombobox is a searchable multi-choice picker that shows its selection as removable chips.
 */
export function MultiCombobox(props: MultiComboboxProps): ReactElement {
	const { t } = useI18n();
	const control = useFieldControl();
	const known = new Map<string, ComboboxOption>();
	for (const option of [...(props.selectedOptions ?? []), ...props.options]) {
		known.set(option.value, option);
	}

	const selected = props.value.map(value => known.get(value) ?? { value, label: value });
	const items = [...props.options, ...selected.filter(option => !props.options.some(candidate => candidate.value === option.value))];

	return (
		<BaseCombobox.Root
			multiple
			items={items}
			value={selected}
			disabled={props.disabled}
			filter={props.onSearch === undefined ? undefined : null}
			itemToStringLabel={(option: ComboboxOption) => option.label}
			isItemEqualToValue={(first: ComboboxOption, second: ComboboxOption) => first.value === second.value}
			onValueChange={(next: ComboboxOption[]) => props.onChange(next.map(option => option.value))}
			onInputValueChange={(term, details) => {
				if (props.onSearch !== undefined && details.reason === 'input-change') {
					props.onSearch(term);
				}
			}}
		>
			<BaseCombobox.InputGroup
				className={cn(CONTROL_CLASS, 'cf:flex cf:min-h-11 cf:cursor-text cf:flex-wrap cf:items-center cf:gap-1.5 cf:py-1.5')}
			>
				<BaseCombobox.Chips className="cf:flex cf:w-full cf:flex-wrap cf:items-center cf:gap-1.5">
					{selected.map(option => (
						<BaseCombobox.Chip
							key={option.value}
							className="cf:flex cf:items-center cf:gap-1.5 cf:rounded-md cf:bg-sunken cf:py-0.5 cf:ps-2 cf:pe-0.5 cf:text-[13px] cf:font-medium cf:text-ink"
						>
							{option.label}
							<BaseCombobox.ChipRemove
								aria-label={t('common.clear')}
								className="cf:m-0 cf:grid cf:size-5 cf:cursor-pointer cf:appearance-none cf:place-items-center cf:rounded cf:border-0 cf:bg-transparent cf:p-0 cf:text-muted cf:hover:bg-line"
							>
								<Icon icon={X} size="xs" />
							</BaseCombobox.ChipRemove>
						</BaseCombobox.Chip>
					))}
					<BaseCombobox.Input
						id={control.id}
						aria-describedby={control['aria-describedby']}
						aria-label={props.label}
						placeholder={selected.length === 0 ? props.placeholder : ''}
						onBlur={props.onBlur}
						className="cf:h-7 cf:min-w-24 cf:flex-1 cf:border-0 cf:bg-transparent cf:p-0 cf:text-sm cf:text-ink cf:outline-none cf:placeholder:text-subtle"
					/>
				</BaseCombobox.Chips>
			</BaseCombobox.InputGroup>
			<ComboboxPopup loading={props.loading === true} emptyText={props.emptyText} />
		</BaseCombobox.Root>
	);
}

/**
 * ComboboxPopup is the shared dropdown list for both combobox variants.
 */
function ComboboxPopup(props: { readonly loading: boolean; readonly emptyText: string }): ReactElement {
	const container = usePortalContainer();

	return (
		<BaseCombobox.Portal container={container}>
			<BaseCombobox.Positioner sideOffset={6} className="cf:z-[100000] cf:outline-none">
				<BaseCombobox.Popup className={cn(POPUP_CLASS, 'cf:w-(--anchor-width) cf:max-w-(--available-width)')}>
					<BaseCombobox.Empty>
						<div className="cf:px-3 cf:py-3">
							<Text size="sm" tone="muted">
								{props.emptyText}
							</Text>
						</div>
					</BaseCombobox.Empty>
					<BaseCombobox.List
						className={cn(
							'cf:max-h-[min(288px,var(--available-height))] cf:overflow-y-auto cf:outline-none',
							props.loading && 'cf:opacity-60',
						)}
					>
						{(option: ComboboxOption) => (
							<BaseCombobox.Item
								key={option.value}
								value={option}
								className="cf:flex cf:cursor-pointer cf:items-center cf:gap-3 cf:rounded-lg cf:px-2.5 cf:py-2 cf:outline-none cf:select-none cf:data-highlighted:bg-sunken"
							>
								{option.avatarUserID !== undefined && <Avatar name={option.label} userID={option.avatarUserID} size="sm" />}
								<span className="cf:flex cf:min-w-0 cf:flex-1 cf:flex-col">
									<span className="cf:truncate cf:text-sm cf:font-medium" dir="auto">
										{option.label}
									</span>
									{option.description !== undefined && (
										<span className="cf:truncate cf:text-xs cf:text-muted" dir="auto">
											{option.description}
										</span>
									)}
								</span>
								<BaseCombobox.ItemIndicator className="cf:text-ink">
									<Icon icon={Check} size="sm" />
								</BaseCombobox.ItemIndicator>
							</BaseCombobox.Item>
						)}
					</BaseCombobox.List>
				</BaseCombobox.Popup>
			</BaseCombobox.Positioner>
		</BaseCombobox.Portal>
	);
}
