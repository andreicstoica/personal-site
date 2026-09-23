/** Lab UI is local `astro dev` and Vercel preview. Production stays clean. */
export function showWeatherLab(dev: boolean): boolean {
	if (dev) return true;
	return readVercelEnv() === "preview";
}

function readVercelEnv(): string | undefined {
	const scope: unknown = globalThis;
	if (typeof scope !== "object" || scope === null) return undefined;
	const proc = readField(scope, "process");
	if (typeof proc !== "object" || proc === null) return undefined;
	const env = readField(proc, "env");
	if (typeof env !== "object" || env === null) return undefined;
	const value = readField(env, "VERCEL_ENV");
	return typeof value === "string" ? value : undefined;
}

function readField(source: object, key: string): unknown {
	if (!(key in source)) return undefined;
	return Reflect.get(source, key);
}
