export type StitchCorner =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

export type Thread = "madder" | "black";

/** Madder red and black wool, the two threads of an ie or a ștergar. */
export const THREAD_COLOR: Record<Thread, string> = {
	madder: "#a3302a",
	black: "#1c1a19",
};

/**
 * A corner piece (colțar) drawn for the top-left corner: a black border that
 * thins to single stitches, around an eight-pointed star (steluța). One
 * character is one cross-stitch: R madder, K black, "." bare.
 */
const CORNER_CHART = [
	"KKKKKKKKKKKKKKK.K.K.",
	"K...................",
	"K...................",
	"K.........R.........",
	"K........RRR........",
	"K....R...RKR...R....",
	"K.....RR.RKR.RR.....",
	"K.....RR.RKR.RR.....",
	"K.......R.R.R.......",
	"K...RRR...R...RRR...",
	"K..RRKKKRRKRRKKKRR..",
	"K...RRR...R...RRR...",
	"K.......R.R.R.......",
	"K.....RR.RKR.RR.....",
	"K.....RR.RKR.RR.....",
	".....R...RKR...R....",
	"K........RRR........",
	"..........R.........",
	"K...................",
	"....................",
] as const;

export type Leg = {
	/** Where the needle comes up, in stitch units from the top-left. */
	from: readonly [number, number];
	/** Where it goes back down. */
	to: readonly [number, number];
	thread: Thread;
	/** The second leg of the cross, laid over the first. */
	over: boolean;
	row: number;
};

export type StitchPiece = { width: number; height: number; legs: Leg[] };

/**
 * Legs in sewing order, mirrored into the given corner. Rows run outward
 * from the corner. Each row lays its "/" legs moving away from the corner,
 * then crosses them with "\" legs on the way back, the way a cross-stitch
 * row is worked by hand. Every corner keeps "\" on top.
 */
export function cornerPiece(corner: StitchCorner): StitchPiece {
	const height = CORNER_CHART.length;
	const width = CORNER_CHART[0]?.length ?? 0;
	const flipX = corner.endsWith("right");
	const flipY = corner.startsWith("bottom");
	const legs: Leg[] = [];
	CORNER_CHART.forEach((line, row) => {
		const cells: { x: number; y: number; thread: Thread }[] = [];
		[...line].forEach((mark, column) => {
			if (mark === ".") return;
			cells.push({
				x: flipX ? width - 1 - column : column,
				y: flipY ? height - 1 - row : row,
				thread: mark === "R" ? "madder" : "black",
			});
		});
		for (const { x, y, thread } of cells)
			legs.push({ from: [x, y + 1], to: [x + 1, y], thread, over: false, row });
		for (const { x, y, thread } of [...cells].reverse())
			legs.push({ from: [x + 1, y + 1], to: [x, y], thread, over: true, row });
	});
	return { width, height, legs };
}
