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
