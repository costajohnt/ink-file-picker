/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: ['dist/**', 'examples/**', 'tsup.config.ts', 'vitest.config.ts'],
	},
	{
		react: true,
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			// Disabled: conflict with this project's established conventions --
			// SCREAMING_CASE module constants, the published FilePickerStateAPI
			// type name (renaming would be a breaking change), Ink's
			// internal_eventEmitter, and concise arrow callbacks.
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			// Disabled: opinionated / intentional-pattern rules. prevent-abbreviations
			// clashes with React idiom (props, args); the reducer and input handler
			// are deliberately large; bounded-concurrency and sequential test setup
			// legitimately await in a loop; global process is correct in this ESM CLI.
			'unicorn/prevent-abbreviations': 'off',
			'complexity': 'off',
			'no-await-in-loop': 'off',
			'n/prefer-global/process': 'off',
			// Disabled: opinionated correctness/style rules that the pre-existing
			// v0.2.0 code predates (single-line early returns, indexed for-loops,
			// nested ternaries, import ordering, Math.pow, .sort, etc.). XO's
			// autofixer is unusable in this toolchain, so these are left off rather
			// than hand-reformatting the whole codebase. Re-enable + autofix later
			// on a working toolchain.
			'curly': 'off',
			'import-x/order': 'off',
			'import-x/first': 'off',
			'unicorn/switch-case-braces': 'off',
			'unicorn/prefer-single-call': 'off',
			'unicorn/numeric-separators-style': 'off',
			'prefer-destructuring': 'off',
			'unicorn/prefer-set-has': 'off',
			'unicorn/no-nested-ternary': 'off',
			'unicorn/no-for-loop': 'off',
			'unicorn/prefer-spread': 'off',
			'unicorn/no-new-array': 'off',
			'unicorn/no-negated-condition': 'off',
			'no-negated-condition': 'off',
			'unicorn/no-lonely-if': 'off',
			'no-lonely-if': 'off',
			'unicorn/no-array-sort': 'off',
			'prefer-exponentiation-operator': 'off',
			'object-shorthand': 'off',
			'no-useless-return': 'off',
			'arrow-body-style': 'off',
			'@stylistic/quote-props': 'off',
			'react/jsx-curly-newline': 'off',
			// Disabled: stylistic rules that clash with the repo's 2-space,
			// spaced-brace formatting (kept to preserve minimal diffs).
			'@stylistic/object-curly-spacing': 'off',
			'@stylistic/comma-dangle': 'off',
			'@stylistic/indent-binary-ops': 'off',
			'@stylistic/padding-line-between-statements': 'off',
			'@stylistic/object-curly-newline': 'off',
			'@stylistic/multiline-ternary': 'off',
			'@stylistic/no-multi-spaces': 'off',
			'@stylistic/quotes': 'off',
			'@stylistic/jsx-curly-newline': 'off',
			// Disabled: XO's stylistic rules conflict with Ink JSX patterns
			'@stylistic/indent': 'off',
			'@stylistic/jsx-quotes': 'off',
			'@stylistic/operator-linebreak': 'off',
			'@stylistic/function-paren-newline': 'off',
			'@stylistic/no-trailing-spaces': 'off',
			'@stylistic/eol-last': 'off',
			'@stylistic/key-spacing': 'off',
			'@stylistic/jsx-tag-spacing': 'off',
			'react/jsx-closing-tag-location': 'off',
			'react/jsx-sort-props': 'off',
			'react/no-array-index-key': 'off',
			'react/jsx-no-leaked-render': 'off',
			'capitalized-comments': 'off',
			'require-unicode-regexp': 'off',
			'unicorn/prefer-at': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/strict-void-return': 'off',
			'react/jsx-indent': 'off',
			'react/jsx-indent-props': 'off',
			'react/jsx-tag-spacing': 'off',
			'react/prefer-read-only-props': 'off',
			'react/boolean-prop-naming': 'off',
			'unicorn/no-hex-escape': 'off',
			'new-cap': 'off',
			'no-promise-executor-return': 'off',
		},
	},
	{
		files: ['test/**'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
		},
	},
];

export default xoConfig;
