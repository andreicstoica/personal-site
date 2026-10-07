/**
 * Icons from Pixelarticons (MIT), https://github.com/halfmage/pixelarticons.
 * Each icon is imported as its own file, so only the icons named here ship.
 * Browse the full set at https://pixelarticons.com before adding one.
 */
import arrowDown from "pixelarticons/svg/arrow-down.svg?raw";
import arrowRight from "pixelarticons/svg/arrow-right.svg?raw";
import arrowUp from "pixelarticons/svg/arrow-up.svg?raw";
import article from "pixelarticons/svg/article.svg?raw";
import bookOpen from "pixelarticons/svg/book-open.svg?raw";
import camera from "pixelarticons/svg/camera.svg?raw";
import chevronDown from "pixelarticons/svg/chevron-down.svg?raw";
import chevronRight from "pixelarticons/svg/chevron-right.svg?raw";
import chevronUp from "pixelarticons/svg/chevron-up.svg?raw";
import clock from "pixelarticons/svg/clock.svg?raw";
import close from "pixelarticons/svg/close.svg?raw";
import cloud from "pixelarticons/svg/cloud.svg?raw";
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
import mapPin from "pixelarticons/svg/map-pin.svg?raw";
import message from "pixelarticons/svg/message.svg?raw";
import moon from "pixelarticons/svg/moon.svg?raw";
import penSquare from "pixelarticons/svg/pen-square.svg?raw";
import repeat from "pixelarticons/svg/repeat.svg?raw";
import robot from "pixelarticons/svg/robot.svg?raw";
import search from "pixelarticons/svg/search.svg?raw";
import sun from "pixelarticons/svg/sun.svg?raw";
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
	"arrow-down": inner(arrowDown),
	"arrow-right": inner(arrowRight),
	"arrow-up": inner(arrowUp),
	article: inner(article),
	"book-open": inner(bookOpen),
	camera: inner(camera),
	"chevron-down": inner(chevronDown),
	"chevron-right": inner(chevronRight),
	"chevron-up": inner(chevronUp),
	clock: inner(clock),
	close: inner(close),
	cloud: inner(cloud),
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
	"map-pin": inner(mapPin),
	message: inner(message),
	moon: inner(moon),
	"pen-square": inner(penSquare),
	repeat: inner(repeat),
	robot: inner(robot),
	search: inner(search),
	sun: inner(sun),
	"text-cursor": inner(textCursor),
	tools: inner(tools),
	users: inner(users),
} as const;

export type PixelarticonName = keyof typeof pixelarticons;
