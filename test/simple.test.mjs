import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { platform, tmpdir } from 'node:os';
import assert from 'node:assert';
import fs from 'node:fs/promises';

const ROOT_DIR = new URL('../', import.meta.url);
const { bin } = JSON.parse(
	await fs.readFile(new URL('./package.json', ROOT_DIR), 'utf-8'),
);

const tmpDir = await fs.mkdtemp(join(tmpdir(), 'tsen-test-'));

await Promise.all([
	fs.writeFile(
		join(tmpDir, 'entryPoint.ts'),
		`#!${
			// macOS doesn't support shebangs pointing at scripts for some reason
			(platform() === 'darwin' ? '/usr/bin/env ' : '') +
			fileURLToPath(new URL(bin, ROOT_DIR))
		}\n
    'use strict';
    console.log('this is not undefined', this !== undefined);
    import './static-empty.ts';
    import('./dynamic.ts').then(module => console.log('dynamic', Object.keys(module)), console.error);
    import('some-esm-package').then(module => console.log('some-esm-package', Object.keys(module)), console.error);
    import('some-cjs-package').then(module => console.log('some-cjs-package', Object.keys(module)), console.error);
    \n`,
		'ascii',
	),

	fs.writeFile(join(tmpDir, 'static-empty.ts'), ''),

	fs.writeFile(
		join(tmpDir, 'dynamic.ts'),
		`"use strict";
    export default 1;
    export const a = 1;
    export const b = 1;
    \n`,
	),

	fs.mkdir(join(tmpDir, 'node_modules', 'some-esm-package'), {
		recursive: true,
	}),
	fs.mkdir(join(tmpDir, 'node_modules', 'some-cjs-package'), {
		recursive: true,
	}),
]);

await Promise.all([
	fs.writeFile(
		join(tmpDir, 'node_modules', 'some-esm-package', 'package.json'),
		'{ "main": "./index.mjs" }\n',
	),
	fs.writeFile(
		join(tmpDir, 'node_modules', 'some-esm-package', 'index.mjs'),
		'export const esm = true;\n',
	),
	fs.writeFile(
		join(tmpDir, 'node_modules', 'some-cjs-package', 'index.js'),
		'"use strict";exports.cjs=true;\n',
	),

	fs.chmod(join(tmpDir, 'entryPoint.ts'), 0o777),
]);

try {
	const cp = spawn(join(tmpDir, 'entryPoint.ts'));

	const [exitStatus, stdoutArray, stderrArray] = await Promise.all([
		once(cp, 'exit'),
		cp.stdout.toArray(),
		cp.stderr.toArray(),
	]);

	const stdout = Buffer.concat(stdoutArray).toString('utf-8');
	const stderr = Buffer.concat(stderrArray).toString('utf-8');

	assert.strictEqual(stderr, '');
	assert.match(stdout, /^this is not undefined true$/m);
	assert.match(stdout, /^dynamic \[ 'default', 'a', 'b' \]$/m);
	assert.match(stdout, /^some-esm-package \[ 'esm' \]$/m);
	assert.match(stdout, /^some-cjs-package \[ 'cjs', 'default' \]$/m);
	assert.deepStrictEqual(exitStatus, [0, null]);
} finally {
	await fs.rm(tmpDir, { recursive: true, force: true });
}
