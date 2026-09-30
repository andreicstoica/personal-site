import type { BannerTarget } from "./interact";

/** Each target gets its own pitch, so the three controls sound distinct. */
const PITCH: Record<BannerTarget, number> = {
	sky: 1320,
	sun: 990,
	land: 660,
};

/** Gap between the first and second curtain of a focal-plane shutter. Fast
 *  mechanical speeds travel the frame plane in well under 20ms, and that
 *  spacing is what makes the pair read as one mechanism. */
const CURTAIN_GAP = 0.016;

let context: AudioContext | null = null;

/**
 * One curtain passing the gate: a broadband blade snap shaped by a very fast
 * exponential decay, plus the ring of the mechanism it is passing. The decay
 * stands in for the impulse response of the metal, which is what makes it read
 * as a hard mechanical edge rather than a tone.
 */
function curtain(
	audio: AudioContext,
	out: GainNode,
	start: number,
	pitch: number,
	gain: number,
): void {
	const seconds = 0.03;
	const length = Math.ceil(audio.sampleRate * seconds);
	const buffer = audio.createBuffer(1, length, audio.sampleRate);
	const samples = buffer.getChannelData(0);
	const decay = (age: number): number =>
		age < 0 ? 0 : Math.min(1, age / 0.00015) * Math.exp(-age / 0.0009);
	for (let i = 0; i < length; i++) {
		samples[i] = (Math.random() * 2 - 1) * decay(i / audio.sampleRate);
	}

	const source = audio.createBufferSource();
	source.buffer = buffer;
	const ring = audio.createBiquadFilter();
	ring.type = "bandpass";
	ring.frequency.value = pitch;
	ring.Q.value = 7;
	const ringGain = audio.createGain();
	ringGain.gain.value = gain;
	// The snap has to survive laptop speakers, which cannot render a
	// high-Q band at these frequencies at all.
	const tick = audio.createBiquadFilter();
	tick.type = "highpass";
	tick.frequency.value = 2600;
	tick.Q.value = 0.7;
	const tickGain = audio.createGain();
	tickGain.gain.value = gain * 0.55;

	source.connect(ring).connect(ringGain).connect(out);
	source.connect(tick).connect(tickGain).connect(out);
	source.start(start);
	source.addEventListener(
		"ended",
		() => {
			for (const node of [source, ring, ringGain, tick, tickGain])
				node.disconnect();
		},
		{ once: true },
	);
}

/**
 * A focal-plane shutter: the body moves, then two curtains cross the gate a
 * fixed distance apart. One strike reads as a click, but a pair reads as a
 * mechanism releasing, which is what makes it feel tactile.
 *
 * Synthesized, so no audio file loads until someone clicks. The context is
 * created on the first click because browsers only start audio from a gesture.
 */
export function playClick(target: BannerTarget): void {
	try {
		context ??= new AudioContext();
		const audio = context;
		if (audio.state === "suspended") void audio.resume().catch(() => {});
		const start = audio.currentTime;
		const pitch = PITCH[target] * (0.97 + Math.random() * 0.06);

		const out = audio.createGain();
		out.gain.value = 0.22;
		out.connect(audio.destination);

		// Body and mirror: the mass moving, which is what the fingers register
		// before they register any pitch.
		const body = audio.createOscillator();
		body.type = "triangle";
		body.frequency.setValueAtTime(pitch * 0.5, start);
		body.frequency.exponentialRampToValueAtTime(pitch * 0.42, start + 0.025);
		const bodyGain = audio.createGain();
		bodyGain.gain.setValueAtTime(0.5, start);
		bodyGain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
		body.connect(bodyGain).connect(out);
		body.start(start);
		body.stop(start + 0.055);

		curtain(audio, out, start, pitch, 0.9);
		// The second curtain is quieter and lands slightly off its nominal pitch,
		// as a real one does once the springs have taken up.
		curtain(audio, out, start + CURTAIN_GAP, pitch * 1.06, 0.45);

		body.addEventListener(
			"ended",
			() => {
				for (const node of [body, bodyGain, out]) node.disconnect();
			},
			{ once: true },
		);
	} catch {
		// No Web Audio: the scene still changes, silently.
	}
}
