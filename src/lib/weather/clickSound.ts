import type { BannerTarget } from "./interact";

/** Each target gets its own tone, so the three controls stay distinct. This
 *  colours the transient rather than pitching it: a resonant ring at these
 *  frequencies is what makes a click sound synthetic. */
const TONE: Record<BannerTarget, number> = {
	sky: 2100,
	sun: 1400,
	land: 850,
};

let context: AudioContext | null = null;

/**
 * A focal-plane shutter, which is several small events rather than one: the
 * blades hit the gate, the mechanism settles, a spring rattles. Modelling that
 * as a burst of very short broadband transients is what makes it read as
 * metal. A single pitched partial with a long tail is what makes it read as a
 * game sound effect, so there is deliberately almost no pitch in here.
 */
export function playClick(target: BannerTarget): void {
	try {
		context ??= new AudioContext();
		const audio = context;
		if (audio.state === "suspended") void audio.resume().catch(() => {});
		const start = audio.currentTime;
		const tone = TONE[target];
		// Slight jitter so repeats are not identical, but not enough to read as
		// a dropout: too much and the mechanism sounds like it is malfunctioning.
		const jitter = 0.94 + Math.random() * 0.12;

		// Contact, settle, rattle: three transients close together, so they read
		// as one snap from a mechanism rather than as scattered clicks.
		const seconds = 0.03;
		const length = Math.ceil(audio.sampleRate * seconds);
		const buffer = audio.createBuffer(1, length, audio.sampleRate);
		const samples = buffer.getChannelData(0);
		const impulse = (age: number): number =>
			age < 0 ? 0 : Math.min(1, age / 0.00012) * Math.exp(-age / 0.0009);
		for (let i = 0; i < samples.length; i++) {
			const t = i / audio.sampleRate;
			samples[i] =
				(Math.random() * 2 - 1) *
				(impulse(t) +
					0.38 * impulse(t - 0.0018 * jitter) +
					0.13 * impulse(t - 0.0045 * jitter));
		}

		const source = audio.createBufferSource();
		source.buffer = buffer;

		// Bright path: the snap itself. Kept off the top end so it stays crisp
		// rather than harsh; a highpass much above this reads as a digital tick.
		const edge = audio.createBiquadFilter();
		edge.type = "highpass";
		edge.frequency.value = 1500;
		edge.Q.value = 0.7;
		const edgeGain = audio.createGain();
		edgeGain.gain.value = 0.8;

		// Tone path: only a hint, and deliberately wide Q so it colours the
		// click instead of ringing it.
		const colour = audio.createBiquadFilter();
		colour.type = "lowpass";
		colour.frequency.value = tone;
		colour.Q.value = 0.9;
		const colourGain = audio.createGain();
		colourGain.gain.value = 0.4;

		const out = audio.createGain();
		out.gain.value = 0.3;
		source.connect(edge).connect(edgeGain).connect(out);
		source.connect(colour).connect(colourGain).connect(out);
		out.connect(audio.destination);

		// Body: the weight under the snap. Long enough to feel solid, short
		// enough to stay a click.
		const body = audio.createOscillator();
		body.type = "triangle";
		body.frequency.setValueAtTime(138, start);
		body.frequency.exponentialRampToValueAtTime(88, start + 0.02);
		const bodyGain = audio.createGain();
		bodyGain.gain.setValueAtTime(0.42, start);
		bodyGain.gain.exponentialRampToValueAtTime(0.001, start + 0.03);
		body.connect(bodyGain).connect(out);
		body.start(start);
		body.stop(start + 0.035);

		source.addEventListener(
			"ended",
			() => {
				for (const node of [source, edge, edgeGain, colour, colourGain])
					node.disconnect();
			},
			{ once: true },
		);
		body.addEventListener(
			"ended",
			() => {
				for (const node of [body, bodyGain, out]) node.disconnect();
			},
			{ once: true },
		);
		source.start(start);
	} catch {
		// No Web Audio: the scene still changes, silently.
	}
}
