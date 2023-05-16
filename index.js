'use strict';

const pirates = require('pirates');
const { transform } = require('sucrase');

/**
 * @param {string} extension File extension. All files with said file extension
 *                           that go through the CJS loader will be transpiled.
 * @param {import('sucrase').Options} [options] Options to pass to the Sucrase transform function.
 * @returns {import('pirates').RevertFunction}
 */
function addHook(extension, options) {
	return pirates.addHook(
		(code, filePath) => {
			const { code: transformedCode, sourceMap } = transform(
				// Replace dynamic imports of `.ts` files with `require`.
				// Hooking into the Node.js ESM resolver would take more effort.
				code.replace(
					/\bimport(\(['"]\.[^'"]+\.ts['"]\))/g,
					`Promise.resolve(require$1)`,
				),
				{
					...options,
					sourceMapOptions: { compiledFilename: filePath },
					filePath,
				},
			);
			const mapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString(
				'base64',
			);
			const suffix = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}`;
			return `${transformedCode}\n${suffix}`;
		},
		{ exts: [extension] },
	);
}

function defaultHooks() {
	addHook('.js');
	addHook('.ts', {
		transforms: ['imports', 'typescript'],
		// We ask Sucrase to preserve dynamic imports because we replace them
		// ourselves.
		preserveDynamicImport: true,
	});
}

if (module.isPreloading) {
	defaultHooks();
}

module.exports = {
	addHook,
	defaultHooks,
};
