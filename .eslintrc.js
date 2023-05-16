module.exports = {
	parserOptions: {
		sourceType: 'script',
		ecmaVersion: 2022,
		jsx: false,
	},
	env: { node: true, es2022: true },
	extends: 'eslint:recommended',
	overrides: [
		{
			files: ['*.mjs'],
			parserOptions: {
				sourceType: 'module',
			},
			env: { node: false, 'shared-node-browser': true },
		},
	],
};
