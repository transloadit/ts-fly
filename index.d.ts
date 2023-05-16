import type * as pirates from 'pirates';
import type * as sucrase from 'sucrase';

export function addHook(
	extension: string,
	options?: sucrase.Options,
): ReturnType<typeof pirates.addHook>;
export function defaultHooks(): void;
