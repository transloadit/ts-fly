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
		join(tmpDir, 'entryPoint.mjs'),
		`#!${
			// macOS doesn't support shebangs pointing at scripts for some reason
			(platform() === 'darwin' ? '/usr/bin/env ' : '') +
			fileURLToPath(new URL(bin, ROOT_DIR))
		}\n
    'use strict';
    import {createRequire} from 'node:module';
    const require = createRequire(import.meta.url);
    await 'top-level';
    console.log('require', require('./require.ts'));
    import('./dynamic.ts').then(module => console.log('dynamic TS', Object.keys(module)), console.error);
    import('./dynamic.mjs').then(module => console.log('dynamic ESM', Object.keys(module)), console.error);
    \n`,
		'ascii',
	),

	fs.writeFile(join(tmpDir, 'require.ts'), 'export const a = 1'),
	fs.writeFile(join(tmpDir, 'reexported.js'), 'exports.c = 1'),

	fs.writeFile(
		join(tmpDir, 'dynamic.ts'),
		`"use strict";
    export default 1;
    export const a = 1;
    export const b = 1;
    export * from "./reexported.js";
    \n`,
	),

	fs.writeFile(
		join(tmpDir, 'dynamic.mjs'),
		`
    export default 1;
    export const a = 1;
    export const b = 1;
    export * from "./reexported.js";
    \n`,
	),
]);

await Promise.all([fs.chmod(join(tmpDir, 'entryPoint.mjs'), 0o777)]);

try {
	const cp = spawn(join(tmpDir, 'entryPoint.mjs'));

	const [exitStatus, stdoutArray, stderrArray] = await Promise.all([
		once(cp, 'exit'),
		cp.stdout.toArray(),
		cp.stderr.toArray(),
	]);

	const stdout = Buffer.concat(stdoutArray).toString('utf-8');
	const stderr = Buffer.concat(stderrArray).toString('utf-8');

	assert.match(stdout, /^require \{ a: 1 \}$/m);
	assert.match(stderr, /Unknown file extension ".ts"/);
	assert.match(stdout, /^dynamic ESM \[ 'a', 'b', 'c', 'default' \]$/m);
	assert.deepStrictEqual(exitStatus, [0, null]);
} finally {
	await fs.rm(tmpDir, { recursive: true, force: true });
}
