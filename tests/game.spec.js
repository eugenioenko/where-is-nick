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
async function findOne(page) {
  await ready(page);
  const targets = await sceneTargets(page);
  const found = await page.locator(".target-found").count();
  const point = await imagePoint(page, targets[found]);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(".target-found")).toHaveCount(found + 1);
}
async function find(page) {
  await ready(page);
  const targets = await sceneTargets(page);
  while ((await page.locator(".target-found").count()) < targets.length)
    await findOne(page);
  await expect(page.getByRole("heading", { name: "Nice find!" })).toBeVisible();
}
async function sceneTargets(page) {
  const height = await page
    .getByTestId("scene-image")
    .evaluate((img) => img.naturalHeight);
  return expectedPixels[[1604, 1685, 1623, 1609, 1595].indexOf(height)];
}
async function imagePoint(page, [x, y, width, height]) {
  const image = page.getByTestId("scene-image");
  const box = await image.boundingBox();
  const size = await image.evaluate((img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));
  return {
    x: box.x + ((x + width / 2) / size.width) * box.width,
    y: box.y + ((y + height / 2) / size.height) * box.height,
  };
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
  await expect(page.getByTestId("score")).toHaveText("000");
  await expect(page.getByTestId("score")).toHaveText("000");
  for (let i = 0; i < 5; i++) {
    await find(page);
    await expect(page.getByTestId("score")).toHaveText(
      String([290, 490, 590, 990, 1090][i]).padStart(3, "0"),
    );
    if (i < 4) {
      await page.getByRole("button", { name: "Next scene" }).click();
      await expect(page.getByText("SETTING THE SCENE")).toBeVisible();
    } else await page.getByRole("button", { name: "See my results" }).click();
  }
  await expect(page.getByTestId("result-card")).toContainText("Detective Sam");
  await expect(page.getByTestId("final-score")).toHaveText("1090");
  await expect(page.getByTestId("perfect-bonus")).toHaveCount(0);
  await expect(page.getByTestId("result-card")).toContainText("11 Nicks found");
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

test("timer pauses for loading and breaks but keeps running after finds", async ({
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
  await expect(page.getByTestId("timer")).not.toHaveText(frozen);
  await page.getByRole("button", { name: "Next scene" }).click();
  await expect(page.getByText("SETTING THE SCENE")).toBeVisible();
  const loading = await page.getByTestId("timer").textContent();
  await page.waitForTimeout(200);
  await expect(page.getByTestId("timer")).toHaveText(loading);
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
  await expect(page.getByTestId("score")).toHaveText("300");
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
  await expect(page.getByTestId("score")).toHaveText("300");
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
  expect(data.reviewMode).toBe(false);
  expect(data.wally.giants).toHaveLength(1);
  expect(data.targets.giants[0]).toEqual({
    x: 50,
    y: 50,
    width: 10,
    height: 15,
  });
  expect(data.targets.giants).toHaveLength(3);
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
  const target = await imagePoint(page, expectedPixels[0][0]);
  await page.touchscreen.tap(target.x, target.y);
  await expect(page.getByRole("heading", { name: "Nice find!" })).toBeVisible();
  await expect(page.getByTestId("score")).toHaveText("100");
});

test("total score never displays below zero", async ({ page }) => {
  await start(page);
  await ready(page);
  const scene = await page.getByTestId("scene-image").boundingBox();
  for (let i = 0; i < 12; i++)
    await page.mouse.click(
      scene.x + scene.width * 0.1,
      scene.y + scene.height * 0.7,
    );
  await expect(page.getByTestId("score")).toHaveText("000");
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("180");
  await page.getByRole("button", { name: "Next scene" }).click();
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("380");
});

test("multiple Nicks stay marked, repeated clicks do not score, and totals stay hidden", async ({
  page,
}) => {
  await start(page);
  await ready(page);
  await expect(page.getByRole("button", { name: "Next scene" })).toBeEnabled();
  const first = await imagePoint(page, expectedPixels[0][0]);
  await findOne(page);
  await expect(page.getByTestId("score")).toHaveText("100");
  await expect(page.getByRole("heading", { name: "Nice find!" })).toBeVisible();
  await expect(page.locator(".target-found")).toHaveCount(1);
  const toast = await page.locator(".toast").boundingBox();
  expect(toast.y).toBeGreaterThanOrEqual(0);
  expect(toast.y + toast.height).toBeLessThan(150);
  await page.mouse.click(first.x, first.y);
  await expect(page.getByTestId("score")).toHaveText("100");
  await expect(page.locator(".detective-card")).not.toContainText(
    /remaining|of 2|2 Nicks|2 targets/,
  );
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("300");
  await expect(page.locator(".target-found")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: "Scene cleared!" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Next scene" })).toBeEnabled();
});

test("host can add and remove multiple targets and export the full list", async ({
  page,
}) => {
  await page.goto("/?setup=1");
  await ready(page);
  await page.getByRole("button", { name: "Add Nick" }).click();
  const image = await page.getByTestId("scene-image").boundingBox();
  await page.mouse.move(
    image.x + image.width * 0.3,
    image.y + image.height * 0.2,
  );
  await page.mouse.down();
  await page.mouse.move(
    image.x + image.width * 0.35,
    image.y + image.height * 0.28,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Nick 4", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".setup-result>code")).toHaveText(
    '{"x":30,"y":20,"width":5,"height":8}',
  );
  await page.getByRole("button", { name: "Nick 2", exact: true }).click();
  await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(
    page.getByRole("button", { name: "Nick 4", exact: true }),
  ).toHaveCount(0);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download targets" }).click();
  const stream = await (await event).createReadStream(),
    chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  expect(data.targets.giants).toHaveLength(3);
  expect(data.targets.giants[2]).toEqual({ x: 30, y: 20, width: 5, height: 8 });
  while (
    await page.getByRole("button", { name: "Remove selected" }).isEnabled()
  )
    await page.getByRole("button", { name: "Remove selected" }).click();
  await expect(
    page.getByRole("button", { name: "Remove selected" }),
  ).toBeDisabled();
});

test("every scene can be skipped with zero finds, including during loading", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next scene" }).click();
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.getByTestId("result-card")).toContainText("0 Nicks found");
  await expect(page.getByTestId("result-card")).toContainText(
    "5 scenes explored",
  );
  await expect(page.getByTestId("final-score")).toHaveText("0");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your search is over.",
  );
});

const expectedPixels = [
  [
    [733, 215, 85, 93],
    [628, 1252, 45, 41],
    [1426, 1140, 32, 43],
  ],
  [
    [1007, 1035, 52, 44],
    [1884, 1150, 60, 65],
  ],
  [[2163, 1148, 58, 72]],
  [
    [730, 201, 55, 59],
    [1431, 521, 65, 91],
    [835, 1189, 108, 141],
    [1644, 1252, 54, 97],
  ],
  [[420, 1116, 45, 49]],
];

test("review markers stay hidden and finds match all eleven confirmed locations", async ({
  page,
}) => {
  await start(page);
  const sizes = [
    [2560, 1604],
    [2560, 1685],
    [2560, 1623],
    [2560, 1609],
    [2560, 1595],
  ];
  for (let i = 0; i < 5; i++) {
    await ready(page);
    const info = await page
      .getByTestId("scene-image")
      .evaluate((img) => ({ w: img.naturalWidth, h: img.naturalHeight }));
    expect([info.w, info.h]).toEqual(sizes[i]);
    await expect(page.getByTestId("target-marker")).toHaveCount(0);
    await expect(page.getByTestId("wally-marker")).toHaveCount(0);
    await expect(
      page.locator(".review-banner, .review-note, .header-edition"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /nudge|hint/i })).toHaveCount(
      0,
    );
    const image = await page.getByTestId("scene-image").boundingBox();
    for (let j = 0; j < expectedPixels[i].length; j++) {
      await findOne(page);
      await page
        .getByTestId("target-marker")
        .nth(j)
        .evaluate((el) =>
          Promise.all(
            el.getAnimations().map((animation) => animation.finished),
          ),
        );
      const box = await page.getByTestId("target-marker").nth(j).boundingBox();
      const actual = [
        ((box.x - image.x) / image.width) * info.w,
        ((box.y - image.y) / image.height) * info.h,
        (box.width / image.width) * info.w,
        (box.height / image.height) * info.h,
      ];
      actual.forEach((value, k) =>
        expect(value).toBeCloseTo(expectedPixels[i][j][k], 0),
      );
      expect(
        await page
          .getByTestId("target-marker")
          .nth(j)
          .evaluate((el) => getComputedStyle(el).borderTopColor),
      ).not.toBe("rgb(255, 0, 255)");
    }
    if (i < 4) await page.getByRole("button", { name: "Next scene" }).click();
  }
});

test("Wally deducts exactly 100, is marked once, and prevents a perfect bonus", async ({
  page,
}) => {
  await start(page);
  await find(page);
  await expect(page.getByTestId("score")).toHaveText("300");
  const wally = await imagePoint(page, [433, 1025, 52, 53]);
  await page.mouse.click(wally.x, wally.y);
  await expect(page.getByTestId("score")).toHaveText("200");
  await expect(page.getByText("That’s Wally! −100 points.")).toBeVisible();
  await expect(page.getByTestId("wally-marker")).toHaveCount(1);
  await page.mouse.click(wally.x, wally.y);
  await expect(page.getByTestId("score")).toHaveText("200");
  for (let i = 1; i < 5; i++) {
    await page.getByRole("button", { name: "Next scene" }).click();
    await find(page);
  }
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.getByTestId("final-score")).toHaveText("1000");
  await expect(page.getByTestId("perfect-bonus")).toHaveCount(0);
  await expect(page.getByTestId("wally-total")).toHaveText(
    "1 Wally spotted · −100 points",
  );
  await expect(page.getByTestId("result-card")).toContainText(
    "0 wrong guesses",
  );
});

test("a flawless full search earns 500 bonus points and a Perfect result", async ({
  page,
}) => {
  await start(page, "Perfect Detective");
  for (let i = 0; i < 5; i++) {
    await find(page);
    if (i < 4) await page.getByRole("button", { name: "Next scene" }).click();
  }
  await expect(page.getByTestId("score")).toHaveText("1100");
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Perfect search!",
  );
  await expect(page.getByTestId("perfect-bonus")).toHaveText(
    "PERFECT! +500 bonus points",
  );
  await expect(page.getByTestId("final-score")).toHaveText("1600");
  await expect(page.getByTestId("result-card")).toContainText("11 Nicks found");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save my card" }).click();
  expect(await (await event).failure()).toBeNull();
  await page.getByRole("button", { name: "One more search" }).click();
  await page.getByRole("button", { name: "Start the search" }).click();
  await ready(page);
  await expect(page.getByTestId("score")).toHaveText("000");
});

test("missing a Nick disqualifies the perfect bonus even without mistakes", async ({
  page,
}) => {
  await start(page);
  await findOne(page);
  await findOne(page);
  for (let i = 1; i < 5; i++) {
    await page.getByRole("button", { name: "Next scene" }).click();
    await find(page);
  }
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.getByTestId("final-score")).toHaveText("1000");
  await expect(page.getByTestId("perfect-bonus")).toHaveCount(0);
  await expect(page.getByTestId("result-card")).toContainText("10 Nicks found");
  await expect(page.getByTestId("result-card")).toContainText(
    "0 wrong guesses",
  );
});
