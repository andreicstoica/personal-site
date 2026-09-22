export type InferenceEnv = {
	MODEL_PROVIDER?: string;
	GUIDE_MODEL?: string;
	LOCAL_MODEL_URL?: string;
	LOCAL_MODEL_ID?: string;
	HF_API_URL?: string;
	HF_API_KEY?: string;
	HF_MODEL_ID?: string;
};

export type ProviderName = "local" | "hf";

// Modal is a possible later host: scale-to-zero GPU, per-second billing,
// Starter plan is $0/month with $30 of compute credit. Not wired. Hugging Face
// (MODEL_PROVIDER=hf) is the hosted provider when the guide is allowed to call
// one. Calls stay off unless GUIDE_MODEL=on, so a configured endpoint stays asleep.
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

const DEFAULT_MODEL = "noodlesGS/personal";
const DEFAULT_LOCAL_URL = "http://localhost:1234";

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
