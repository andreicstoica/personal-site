import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.route("**/api/weather", (route) => route.fulfill({ status: 503 }));
});

test("internal navigation keeps the guide open and preserves its draft", async ({
	page,
}) => {
	await page.goto("/about");
	const launcher = page.getByRole("button", { name: "Ask Andrei" });
	await expect(
		launcher.locator("xpath=ancestor::astro-island[1]"),
	).not.toHaveAttribute("ssr");
	await launcher.click();
	const guide = page.getByRole("dialog", { name: "Ask Andrei" });
	const message = guide.getByRole("textbox", { name: "Message" });
	const draft = "What are you working on?";
	await message.fill(draft);

	await page
		.getByRole("navigation", { name: "Breadcrumb" })
		.getByRole("link", { name: "Andrei Stoica" })
		.click();

	await expect(page).toHaveURL("/");
	await expect(guide).toBeVisible();
	await expect(message).toHaveValue(draft);
});

test("Escape closes the gallery and returns focus to its thumbnail", async ({
	page,
}) => {
	await page.goto("/");
	const gallery = page.getByRole("group", { name: "Liftoff media gallery" });
	const thumbnail = gallery.getByRole("button", { name: "Open Liftoff image" });
	await thumbnail.scrollIntoViewIfNeeded();
	await expect(
		gallery.locator("xpath=ancestor::astro-island[1]"),
	).not.toHaveAttribute("ssr");
	await thumbnail.press("Enter");

	const dialog = page.getByRole("dialog", { name: "Liftoff image" });
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");

	await expect(dialog).toBeHidden();
	await expect(thumbnail).toBeFocused();
});
