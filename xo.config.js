import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		// Rules this codebase does not satisfy yet under the shared config.
		// Burn these down by fixing the code and deleting the line.
		rules: {
			'@eslint-react/naming-convention-ref-name': 'off',
			'@stylistic/brace-style': 'off',
			'@stylistic/curly-newline': 'off',
			'@stylistic/max-statements-per-line': 'off',
			'@stylistic/no-mixed-operators': 'off',
			'@stylistic/no-mixed-spaces-and-tabs': 'off',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			complexity: 'off',
			'jsx-a11y-x/aria-props': 'off',
			'n/prefer-global/process': 'off',
			'no-await-in-loop': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/name-replacements': 'off',
			'unicorn/no-new-array': 'off',
			'unicorn/no-useless-recursion': 'off',
			'unicorn/prefer-set-methods': 'off',
			'unicorn/prefer-simple-condition-first': 'off',
			'unicorn/prefer-ternary': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			'package-json/prefer-files-field': 'off',
			'package-json/prefer-type-module': 'off',
			'package-json/require-engines': 'off',
			'package-json/require-entry-point': 'off',
			'package-json/require-fields': 'off',
			'regexp/no-control-character': 'off',
			'unicorn/max-nested-calls': 'off',
			'unicorn/no-array-sort': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
		},
	},
	{
		files: ['**/*.md'],
		rules: {
			'markdown/fenced-code-language': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			'package-json/prefer-files-field': 'off',
			'package-json/prefer-side-effects-field': 'off',
		},
	},
];

export default xoConfig;
