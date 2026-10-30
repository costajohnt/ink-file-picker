import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		rules: {
			// Awaits in loops are deliberate: the bounded-concurrency worker in
			// fs-operations and the sequential polling helpers in the tests.
			'no-await-in-loop': 'off',
			// `Set#intersection()` needs Node 22; `engines.node` is >=20.
			'unicorn/prefer-set-methods': 'off',
		},
	},
	{
		files: [
			'src/components/file-picker/use-file-picker-state.ts',
			'src/components/file-picker/use-file-picker.ts',
		],
		rules: {
			// The action reducer and the keypress handler are flat dispatch tables;
			// splitting them would scatter one switch/if-chain across helpers.
			complexity: 'off',
		},
	},
	{
		files: ['test/**'],
		rules: {
			// `Promise.withResolvers()` needs Node 22; `engines.node` is >=20.
			'unicorn/prefer-promise-with-resolvers': 'off',
		},
	},
	{
		files: ['test/fixtures/**/package.json'],
		rules: {
			// Fixture data read by the fs tests, not a published package.
			'package-json/prefer-files-field': 'off',
			'package-json/prefer-type-module': 'off',
			'package-json/require-engines': 'off',
			'package-json/require-entry-point': 'off',
			'package-json/require-fields': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			// npm always publishes package.json, so the `./package.json` export is
			// covered even though `files` lists only `dist`.
			'package-json/prefer-files-field': 'off',
		},
	},
];

export default xoConfig;
