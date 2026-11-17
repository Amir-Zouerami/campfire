import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Architecture rules, enforced by lint so they cannot silently rot:
 *
 * - `shared/` is the bottom layer and may not import from `features/`, `app/` or `plugin/`.
 * - `features/` may use `shared/` only; features never import each other or the app layer.
 * - Styling lives in `shared/ui`. Feature and app code composes components and never
 *   writes Tailwind utility classes (`cf:` prefixed) itself.
 */
const layerBoundary = (forbidden, message) => ({
	'no-restricted-imports': ['error', { patterns: [{ group: forbidden, message }] }],
});

export default tseslint.config(
	{ ignores: ['dist', 'node_modules', 'coverage'] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	reactHooks.configs.flat['recommended-latest'],
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'no-console': ['error', { allow: ['warn', 'error'] }],
		},
	},
	{
		files: ['src/shared/**'],
		rules: layerBoundary(['@/features/*', '@/app/*', '@/plugin/*'], 'shared/ must not depend on higher layers.'),
	},
	{
		files: ['src/features/**'],
		rules: layerBoundary(
			['@/app/*', '@/plugin/*', '@/features/*'],
			'features/ may only depend on shared/. Cross-feature wiring belongs in app/.',
		),
	},
	{
		files: ['src/features/**', 'src/app/**', 'src/plugin/**'],
		ignores: ['**/*.test.ts', '**/*.test.tsx'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{
					selector: 'Literal[value=/(^|[\\s:])cf:/]',
					message: 'Tailwind utilities belong in shared/ui components. Compose components instead.',
				},
				{
					selector: 'TemplateElement[value.raw=/(^|[\\s:])cf:/]',
					message: 'Tailwind utilities belong in shared/ui components. Compose components instead.',
				},
			],
		},
	},
);
