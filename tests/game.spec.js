import { test, expect } from "@playwright/test";

async function start(page, name = "Detective Sam") {
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s find Nick" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill(name);
  await page.getByRole("button", { name: "Start the search" }).click();
}
async function ready(page) {
  await expect(page.getByTestId("scene-image")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true }),
  ).toBeEnabled();
}
async function find(page) {
  await ready(page);
  const target = await page.getByTestId("target-marker").boundingBox();
  await page.mouse.click(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await expect(
    page.getByRole("heading", { name: "There he is!" }),
  ).toBeVisible();
}

test("intro, username validation, and responsive layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nick");
  await page.getByRole("button", { name: "Let’s find Nick" }).click();
  await page.getByRole("textbox", { name: "Your name" }).fill("   ");
  await page.getByRole("button", { name: "Start the search" }).click();
  await expect(
    page.getByText("Give your detective a name first."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Your name" }).fill("  Sam <3  ");
  await page.getByRole("button", { name: "Start the search" }).click();
  await ready(page);
  await expect(page.locator(".game-top .eyebrow")).toContainText("Sam <3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("all five rounds, penalties, result card download, and replay", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await start(page);
  await expect(page.getByText("SETTING THE SCENE")).toBeVisible();
  await ready(page);
  const scene = await page.getByTestId("scene-image").boundingBox();
  await page.mouse.click(
    scene.x + scene.width * 0.12,
    scene.y + scene.height * 0.7,
  );
  await expect(page.getByText("90 points")).toBeVisible();
  await page.getByRole("button", { name: "A little nudge" }).click();
  await expect(page.getByTestId("hint-area")).toBeVisible();
  await expect(page.getByText("70 points")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await find(page);
    await expect(page.getByTestId("score")).toHaveText(
      String(70 + 100 * i).padStart(3, "0"),
    );
    if (i < 4) {
      await page.getByRole("button", { name: "Next scene" }).click();
      await expect(page.getByText("SETTING THE SCENE")).toBeVisible();
    } else await page.getByRole("button", { name: "See my results" }).click();
  }
  await expect(page.getByTestId("result-card")).toContainText("Detective Sam");
  await expect(page.getByTestId("final-score")).toHaveText("470");
  await expect(page.getByTestId("result-card")).toContainText(
    "5 of 5 Nicks found",
  );
  await expect(page.getByTestId("result-card")).toContainText("1 wrong guess");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save my card" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/where-is-nick-.*\.png/);
  expect(await download.failure()).toBeNull();
  await page.getByRole("button", { name: "One more search" }).click();
  await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue(
    "Detective Sam",
  );
  await page.getByRole("button", { name: "Start the search" }).click();
  await ready(page);
  await expect(page.getByTestId("score")).toHaveText("000");
  await expect(page.getByTestId("timer")).toHaveText("00:00");
  expect(errors).toEqual([]);
});

test("timer pauses for loading, breaks, and post-find celebration", async ({
  page,
}) => {
  let allowImages;
  const gate = new Promise((resolve) => {
    allowImages = resolve;
  });
  await page.route(/\/assets\/1-[^/]+\.jpg/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Let’s find Nick" }).click();
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Patient Detective");
  await page.getByRole("button", { name: "Start the search" }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("timer")).toHaveText("00:00");
  await expect(page.getByText("SETTING THE SCENE")).toBeVisible();
  allowImages();
  await ready(page);
  await expect(page.getByTestId("timer")).not.toHaveText("00:00");
  await page.getByRole("button", { name: "Pause game" }).click();
  const paused = await page.getByTestId("timer").textContent();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("timer")).toHaveText(paused);
  await page.getByRole("button", { name: "Back to the search" }).click();
  await expect(page.getByTestId("timer")).not.toHaveText(paused);
  await find(page);
  const frozen = await page.getByTestId("timer").textContent();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("timer")).toHaveText(frozen);
});

test("image load failure is recoverable and does not run the clock", async ({
  page,
}) => {
  await page.route(/\/assets\/1-[^/]+\.jpg/, (route) => route.abort());
  await start(page);
  await expect(page.getByText("This scene took a wrong turn.")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00");
  await page.unroute(/\/assets\/1-[^/]+\.jpg/);
  await page.getByRole("button", { name: "Try again" }).click();
  await ready(page);
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("100");
});

test("zoom, drag without guessing, accurate hit area, and keyboard controls", async ({
  page,
}) => {
  await start(page);
  await ready(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.getByLabel("Zoom level")).toHaveText("135%");
  const imageBefore = await page.getByTestId("scene-image").boundingBox();
  const box = await page.getByTestId("viewer").boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45, {
    steps: 10,
  });
  await page.mouse.up();
  const imageAfter = await page.getByTestId("scene-image").boundingBox();
  expect(imageAfter.x).not.toBe(imageBefore.x);
  await expect(page.getByText("100 points")).toBeVisible();
  await page.getByRole("button", { name: "Reset view" }).click();
  await expect(page.getByLabel("Zoom level")).toHaveText("100%");
  await page.getByTestId("viewer").focus();
  await page.keyboard.press("+");
  await expect(page.getByLabel("Zoom level")).toHaveText("130%");
  await page.keyboard.press("0");
  await expect(page.getByLabel("Zoom level")).toHaveText("100%");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("100");
});

test("target setup draws and exports usable percentage coordinates", async ({
  page,
}) => {
  await page.goto("/?setup=1");
  await ready(page);
  const img = await page.getByTestId("scene-image").boundingBox();
  await page.mouse.move(img.x + img.width * 0.5, img.y + img.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(img.x + img.width * 0.6, img.y + img.height * 0.65, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator(".setup-result>code")).toHaveText(
    '{"x":50,"y":50,"width":10,"height":15}',
  );
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download targets" }).click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.practiceMode).toBe(false);
  expect(data.targets.giants).toEqual({ x: 50, y: 50, width: 10, height: 15 });
  expect(Object.keys(data.targets)).toHaveLength(5);
  await page.getByRole("button", { name: "Back to game" }).click();
  await expect(
    page.getByRole("button", { name: "Let’s find Nick" }),
  ).toBeVisible();
});

test("touchscreen pinch zooms, dragging does not guess, and tapping finds Nick", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile",
    "Touch gestures apply to mobile.",
  );
  await start(page);
  await ready(page);
  const scene = await page.getByTestId("viewer").boundingBox();
  const x = scene.x + scene.width / 2,
    y = scene.y + scene.height / 2;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 35, y, id: 1 },
      { x: x + 35, y, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 75, y: y - 10, id: 1 },
      { x: x + 75, y: y + 10, id: 2 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.getByLabel("Zoom level")).not.toHaveText("100%");
  await expect(page.getByText("100 points")).toBeVisible();
  await page.getByRole("button", { name: "Reset view" }).tap();
  const target = await page.getByTestId("target-marker").boundingBox();
  await page.touchscreen.tap(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await expect(
    page.getByRole("heading", { name: "There he is!" }),
  ).toBeVisible();
  await expect(page.getByTestId("score")).toHaveText("100");
});

test("a scene score never drops below zero", async ({ page }) => {
  await start(page);
  await ready(page);
  const scene = await page.getByTestId("scene-image").boundingBox();
  for (let i = 0; i < 12; i++)
    await page.mouse.click(
      scene.x + scene.width * 0.1,
      scene.y + scene.height * 0.7,
    );
  await page.getByRole("button", { name: "A little nudge" }).click();
  await expect(page.getByText("0 points", { exact: true })).toBeVisible();
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("000");
  await page.getByRole("button", { name: "Next scene" }).click();
  await ready(page);
  await expect(page.getByText("100 points", { exact: true })).toBeVisible();
});
