import type { BannerTarget } from "./interact";

/** Each target gets its own pitch, so the three controls sound distinct. */
const PITCH: Record<BannerTarget, number> = {
	sky: 1320,
	sun: 990,
	land: 660,
};

let context: AudioContext | null = null;

/**
 * A short wooden tick: a falling sine blip over a filtered noise transient.
 * Synthesized, so no audio file loads until someone clicks. The context is
 * created on the first click because browsers only start audio from a gesture.
 */
export function playClick(target: BannerTarget): void {
	try {
		context ??= new AudioContext();
		const audio = context;
		if (audio.state === "suspended") void audio.resume();
		const start = audio.currentTime;
		const pitch = PITCH[target] * (0.97 + Math.random() * 0.06);

		const out = audio.createGain();
		out.gain.value = 0.12;
		out.connect(audio.destination);

		const tone = audio.createOscillator();
		const toneGain = audio.createGain();
		tone.type = "sine";
		tone.frequency.setValueAtTime(pitch, start);
		tone.frequency.exponentialRampToValueAtTime(pitch * 0.5, start + 0.06);
		toneGain.gain.setValueAtTime(1, start);
		toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
		tone.connect(toneGain).connect(out);
		tone.start(start);
		tone.stop(start + 0.09);

		const length = Math.ceil(audio.sampleRate * 0.012);
		const buffer = audio.createBuffer(1, length, audio.sampleRate);
		const samples = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) {
			samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
		}
		const noise = audio.createBufferSource();
		const band = audio.createBiquadFilter();
		const noiseGain = audio.createGain();
		noise.buffer = buffer;
		band.type = "bandpass";
		band.frequency.value = pitch * 2;
		band.Q.value = 1.2;
		noiseGain.gain.value = 0.5;
		noise.connect(band).connect(noiseGain).connect(out);
		noise.start(start);
	} catch {
		// No Web Audio: the scene still changes, silently.
	}
}
