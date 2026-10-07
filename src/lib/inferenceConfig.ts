export type InferenceEnv = {
	MODEL_PROVIDER?: string;
	GUIDE_MODEL?: string;
	LOCAL_MODEL_URL?: string;
	LOCAL_MODEL_ID?: string;
	MODEL_BASE_URL?: string;
	MODEL_API_KEY?: string;
	MODEL_ID?: string;
	/** AI Gateway only: providers to try first, comma separated. */
	MODEL_GATEWAY_ORDER?: string;
};

export type ProviderName = "local" | "hosted";

export type Auth = { kind: "none" } | { kind: "bearer"; token: string };

export type ResolvedInference =
	| {
			kind: "ready";
			provider: ProviderName;
			baseUrl: string;
			model: string;
			auth: Auth;
	  }
	| {
			kind: "unconfigured";
			provider: ProviderName | "unknown";
			reason: string;
	  };

const DEFAULT_LOCAL_MODEL = "noodlesGS/personal";
const DEFAULT_LOCAL_URL = "http://localhost:1234/v1";

function clean(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function stripSlash(url: string): string {
	return url.replace(/\/$/, "");
}

export function guideModelEnabled(env: InferenceEnv): boolean {
	return clean(env.GUIDE_MODEL)?.toLowerCase() === "on";
}

/** Both providers speak the OpenAI chat-completions API. A base URL includes
 *  the version segment (`…/v1`), so any compatible host is an env change. */
export function resolveInference(env: InferenceEnv): ResolvedInference {
	const provider = (clean(env.MODEL_PROVIDER) ?? "local").toLowerCase();

	switch (provider) {
		case "local":
			return {
				kind: "ready",
				provider: "local",
				baseUrl: stripSlash(clean(env.LOCAL_MODEL_URL) ?? DEFAULT_LOCAL_URL),
				model: clean(env.LOCAL_MODEL_ID) ?? DEFAULT_LOCAL_MODEL,
				auth: { kind: "none" },
			};
		case "hosted": {
			const baseUrl = clean(env.MODEL_BASE_URL);
			const token = clean(env.MODEL_API_KEY);
			const model = clean(env.MODEL_ID);
			if (!baseUrl || !token || !model) {
				return {
					kind: "unconfigured",
					provider: "hosted",
					reason: "Hosted needs MODEL_BASE_URL, MODEL_API_KEY, and MODEL_ID",
				};
			}
			return {
				kind: "ready",
				provider: "hosted",
				baseUrl: stripSlash(baseUrl),
				model,
				auth: { kind: "bearer", token },
			};
		}
		default:
			return {
				kind: "unconfigured",
				provider: "unknown",
				reason: `Unknown MODEL_PROVIDER "${provider}"`,
			};
	}
}

export function authHeaders(auth: Auth): Record<string, string> {
	switch (auth.kind) {
		case "none":
			return {};
		case "bearer":
			return { Authorization: `Bearer ${auth.token}` };
		default: {
			const _exhaustive: never = auth;
			return _exhaustive;
		}
	}
}
