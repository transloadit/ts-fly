# @transloadit/ts-fly

`ts-fly` is a simple wrapper around Node.js that registers [Sucrase][] hooks,
making it possible to run TypeScript files in addition to JavaScript files
transparently. The difference with Sucrase is that it would let you import
ESM-only libraries, as well as `.ts` files.

TypeScript and JavaScript files can also import each other.

Like Sucrase, you should not run this on production. If you do, you are on your
own.

## Install

```sh
yarn add --dev @transloadit/ts-fly
```

## Usage

Use the `ts-fly` command the same as you would use `node`. Any CLI arguments are
passed along.

```sh
yarn ts-fly myFile.ts
```

You can use it with `--require` CLI flag:

```sh
node -r @transloadit/ts-fly myFile.ts
```

You can also `require` it from JS:

```js
'use strict';

require('@transloadit/ts-fly').defaultHooks();

require('./myFile.ts'); // works
```

### Limitations

- You can't load `.ts` files from static `import` statements from JS files. You
  have to use dynamic `import()`, or convert the file to TS.
- By default, we only support `.js` and `.ts` file extensions.

## Contributing

```sh
corepack yarn
corepack yarn test
```

## Based on

- <https://github.com/alangpierce/sucrase/blob/7284b3733aa114b3f4f5371e36ff5a4704ec860e/bin/sucrase-node>
- <https://github.com/alangpierce/sucrase/blob/7284b3733aa114b3f4f5371e36ff5a4704ec860e/src/register.ts>

[Sucrase]: https://github.com/alangpierce/sucrase
