/**
 * Icons from Pixelarticons (MIT), https://github.com/halfmage/pixelarticons.
 * Each icon is imported as its own file, so only the icons named here ship.
 * Browse the full set at https://pixelarticons.com before adding one.
 */
import arrowUp from "pixelarticons/svg/arrow-up.svg?raw";
import article from "pixelarticons/svg/article.svg?raw";
import bookOpen from "pixelarticons/svg/book-open.svg?raw";
import camera from "pixelarticons/svg/camera.svg?raw";
import chevronDown from "pixelarticons/svg/chevron-down.svg?raw";
import chevronRight from "pixelarticons/svg/chevron-right.svg?raw";
import close from "pixelarticons/svg/close.svg?raw";
import coffee from "pixelarticons/svg/coffee.svg?raw";
import cpu from "pixelarticons/svg/cpu.svg?raw";
import directions from "pixelarticons/svg/directions.svg?raw";
import externalLink from "pixelarticons/svg/external-link.svg?raw";
import eye from "pixelarticons/svg/eye.svg?raw";
import files from "pixelarticons/svg/files.svg?raw";
import github from "pixelarticons/svg/github.svg?raw";
import human from "pixelarticons/svg/human.svg?raw";
import lightbulb from "pixelarticons/svg/lightbulb.svg?raw";
import link from "pixelarticons/svg/link.svg?raw";
import map from "pixelarticons/svg/map.svg?raw";
import message from "pixelarticons/svg/message.svg?raw";
import penSquare from "pixelarticons/svg/pen-square.svg?raw";
import robot from "pixelarticons/svg/robot.svg?raw";
import textCursor from "pixelarticons/svg/text-cursor.svg?raw";
import tools from "pixelarticons/svg/tools.svg?raw";
import users from "pixelarticons/svg/users.svg?raw";

/** The markup inside the <svg> element: one or more paths on a 24×24 grid. */
function inner(svg: string): string {
	return svg
		.replace(/^[\s\S]*?<svg[^>]*>/, "")
		.replace(/<\/svg>\s*$/, "")
		.trim();
}

export const pixelarticons = {
	"arrow-up": inner(arrowUp),
	article: inner(article),
	"book-open": inner(bookOpen),
	camera: inner(camera),
	"chevron-down": inner(chevronDown),
	"chevron-right": inner(chevronRight),
	close: inner(close),
	coffee: inner(coffee),
	cpu: inner(cpu),
	directions: inner(directions),
	"external-link": inner(externalLink),
	eye: inner(eye),
	files: inner(files),
	github: inner(github),
	human: inner(human),
	lightbulb: inner(lightbulb),
	link: inner(link),
	map: inner(map),
	message: inner(message),
	"pen-square": inner(penSquare),
	robot: inner(robot),
	"text-cursor": inner(textCursor),
	tools: inner(tools),
	users: inner(users),
} as const;

export type PixelarticonName = keyof typeof pixelarticons;
