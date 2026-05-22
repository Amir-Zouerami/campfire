import { cn } from '@/lib/utils';

import { settingsSections } from './settings.sections';
import type { SettingsSection, SettingsSectionID } from './settings.types';

/**
 * visibleSettingsSections returns settings sections available to the current user.
 */
export function visibleSettingsSections(isSystemAdmin: boolean): readonly SettingsSection[] {
	return settingsSections.filter(section => !section.adminOnly || isSystemAdmin);
}

/**
 * resolveSettingsSection keeps the active settings section valid when access changes.
 */
export function resolveSettingsSection(
	activeSection: SettingsSectionID,
	visibleSections: readonly SettingsSection[],
): SettingsSection | null {
	const matchingSection = visibleSections.find(section => section.id === activeSection);

	if (matchingSection !== undefined) {
		return matchingSection;
	}

	return visibleSections.find(section => section.id === 'overview') ?? null;
}

/**
 * settingsSectionButtonClassName returns settings sub-page button classes.
 */
export function settingsSectionButtonClassName(active: boolean): string {
	return cn(
		'cf:flex cf:min-w-[220px] cf:flex-1 cf:flex-col cf:items-start cf:gap-1 cf:rounded-2xl cf:border cf:px-5 cf:py-4 cf:text-left cf:transition',
		'cf:cursor-pointer cf:border-white/10 cf:bg-white/[0.04] hover:cf:border-amber-300/35 hover:cf:bg-amber-300/[0.06]',
		active && 'cf:border-amber-300/45 cf:bg-amber-300/[0.10] cf:shadow-lg',
	);
}
