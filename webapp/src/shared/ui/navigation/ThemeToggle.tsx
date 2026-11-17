import { Moon, Sun } from 'lucide-react';
import type { ReactElement } from 'react';

import { useI18n } from '@/shared/i18n';
import { oppositeTheme, useThemePreference } from '@/shared/theme';

import { IconButton } from '../primitives/IconButton';

type ThemeToggleProps = {
	readonly size?: 'md' | 'lg';
};

/**
 * ThemeToggle switches the Campfire window between its dark and light themes.
 * The icon shows the theme the button switches to.
 */
export function ThemeToggle(props: ThemeToggleProps): ReactElement {
	const { t } = useI18n();
	const { theme, setTheme } = useThemePreference();

	return (
		<IconButton
			icon={theme === 'dark' ? Sun : Moon}
			label={t(theme === 'dark' ? 'shared.theme.useLight' : 'shared.theme.useDark')}
			size={props.size}
			onClick={() => setTheme(oppositeTheme(theme))}
		/>
	);
}
