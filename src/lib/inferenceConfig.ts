export type InferenceEnv = {
	MODEL_PROVIDER?: string;
	LOCAL_MODEL_URL?: string;
	LOCAL_MODEL_ID?: string;
	HF_API_URL?: string;
	HF_API_KEY?: string;
	HF_MODEL_ID?: string;
	MODAL_API_URL?: string;
	MODAL_API_KEY?: string;
	MODAL_MODEL_ID?: string;
	MODAL_PROXY_KEY?: string;
	MODAL_PROXY_SECRET?: string;
};

export type ProviderName = "local" | "hf" | "modal";

export type Auth =
	| { kind: "none" }
	| { kind: "bearer"; token: string }
	| { kind: "modal-proxy"; key: string; secret: string; token: string | null };

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

const DEFAULT_MODEL = "noodlesGS/personal";
const DEFAULT_LOCAL_URL = "http://localhost:1234";

function clean(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function stripSlash(url: string): string {
	return url.replace(/\/$/, "");
}

export function resolveInference(env: InferenceEnv): ResolvedInference {
	const provider = (clean(env.MODEL_PROVIDER) ?? "local").toLowerCase();

	switch (provider) {
		case "local":
			return {
				kind: "ready",
				provider: "local",
				baseUrl: stripSlash(clean(env.LOCAL_MODEL_URL) ?? DEFAULT_LOCAL_URL),
				model: clean(env.LOCAL_MODEL_ID) ?? DEFAULT_MODEL,
				auth: { kind: "none" },
			};
		case "hf": {
			const baseUrl = clean(env.HF_API_URL);
			const token = clean(env.HF_API_KEY);
			if (!baseUrl || !token) {
				return {
					kind: "unconfigured",
					provider: "hf",
					reason: "Hugging Face needs HF_API_URL and HF_API_KEY",
				};
			}
			return {
				kind: "ready",
				provider: "hf",
				baseUrl: stripSlash(baseUrl),
				model: clean(env.HF_MODEL_ID) ?? DEFAULT_MODEL,
				auth: { kind: "bearer", token },
			};
		}
		case "modal": {
			const baseUrl = clean(env.MODAL_API_URL);
			if (!baseUrl) {
				return {
					kind: "unconfigured",
					provider: "modal",
					reason: "Modal needs MODAL_API_URL",
				};
			}
			const proxyKey = clean(env.MODAL_PROXY_KEY);
			const proxySecret = clean(env.MODAL_PROXY_SECRET);
			const apiKey = clean(env.MODAL_API_KEY);
			let auth: Auth = { kind: "none" };
			if (proxyKey && proxySecret) {
				auth = {
					kind: "modal-proxy",
					key: proxyKey,
					secret: proxySecret,
					token: apiKey ?? null,
				};
			} else if (apiKey) {
				auth = { kind: "bearer", token: apiKey };
			}
			return {
				kind: "ready",
				provider: "modal",
				baseUrl: stripSlash(baseUrl),
				model:
					clean(env.MODAL_MODEL_ID) ?? clean(env.HF_MODEL_ID) ?? DEFAULT_MODEL,
				auth,
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
		case "modal-proxy": {
			const headers: Record<string, string> = {
				"Modal-Key": auth.key,
				"Modal-Secret": auth.secret,
			};
			if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
			return headers;
		}
		default: {
			const _exhaustive: never = auth;
			return _exhaustive;
		}
	}
}
