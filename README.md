# Where is Nick?

A game celebrating Nick’s next chapter: enter your name, find Nick in five illustrated scenes, and save your scorecard. Built with React, Vite, and pnpm. All game state stays in the browser; no accounts or backend are needed.

[Play the game](https://eugenioenko.github.io/where-is-nick/) · [Source on GitHub](https://github.com/eugenioenko/where-is-nick)

## Run locally

Use Node 24 (minimum 22.13) and pnpm 11.3.0, matching `package.json`.

```sh
pnpm install
pnpm dev
```

Open the printed URL, normally `http://127.0.0.1:5173/`.

```sh
pnpm build                       # Generates the static site in docs/
pnpm preview                     # Serves the production build
pnpm exec playwright install chromium
pnpm test                        # Builds and tests desktop + mobile
```

`docs/` is generated and ignored by Git. The game uses the replacement artwork in `images/new/1.jpg` through `5.jpg`. Vite bundles these images into the output. The `*test.jpg` annotation references are used for location setup and are not included in the game build. Fonts are served locally, with their OFL licenses in `public/fonts/`.

## Set Nick's real locations

The locations are confirmed and **review overlays are hidden**. The game uses clean replacement images and coordinates extracted from `images/new/*test.jpg` with two pixels of padding. The larger lower-left cyan spot in scene 1 is the confirmed Wally location; the smaller cyan spot was confirmed as a third Nick. Its center is approximately 56.3% across and 72.4% down from the top-left.

The host's reference counts are 3, 2, 1, 4, 1 Nicks in scenes 1–5, plus one Wally in scene 1. Scene 2 now measures 2560 × 1685. These counts are not announced in the player interface.

Set `reviewMode` to `true` in `src/targets.json` to temporarily show magenta Nick overlays and cyan Wally overlays for review. Keep it `false` for players. Found characters will still be marked.

1. Run the app and open `http://127.0.0.1:5173/?setup=1`.
2. Pick a scene. Switch to **Pan & zoom** to position the image, then switch back to **Drawing target** and drag a rectangle around Nick. Use **Add Nick** for each additional hiding place. Select an existing Nick to redraw or remove its rectangle. Every scene must have at least one target.
3. Click **Download targets** and replace `src/targets.json` with the downloaded file. It sets `reviewMode` to `false`, which hides the review overlays and messages, and preserves Wally’s location.
4. Rebuild or push to GitHub to publish the changes.

You can also edit `src/targets.json` directly. Each scene ID maps to an array of rectangles. Each rectangle uses percentages of the original image, with the origin in the top-left corner:

```json
{
  "reviewMode": false,
  "targets": {
    "giants": [{ "x": 28.6328, "y": 13.404, "width": 3.3203, "height": 5.798 }]
  },
  "wally": {
    "giants": [
      { "x": 16.9141, "y": 63.9027, "width": 2.0312, "height": 3.3042 }
    ]
  }
}
```

Older files with a single rectangle per scene are still accepted. Players see no total or remaining Nick count for a scene. Counts in the host editor are for setup only.

For pixel coordinates, calculate `x / imageWidth * 100`, `y / imageHeight * 100`, and the equivalent for width and height. Keep the rectangle inside the image and include a little tapping room around Nick. This keeps the hit area accurate across devices and zoom levels. The host's setup page is an editing aid, not an authentication boundary: this is a static party game.

Nick arrays live under `targets`; Wally arrays live under `wally`. Wally can be adjusted directly in the JSON; the host editor currently edits Nick rectangles and preserves the Wally arrays when exporting. Scene titles, dimensions, order, and scoring settings live in `src/game-config.js`. The number of rounds follows its `rounds` array. Add at least one Nick target for each new round ID.

## Game rules and controls

- Scenes can contain multiple Nicks, and the game does not announce how many are hiding. **Next scene is always available**, even while loading or with zero finds. Found Nicks stay marked; repeated clicks earn no points and incur no penalty. The game does not announce when all targets in a scene have been found.
- Each unique Nick find earns **100 points**. A wrong guess deducts 10; finding Wally deducts **100 points** immediately. Wally is then marked, and clicking the same marked Wally again does not add another penalty. Penalties carry across scenes; the displayed total never falls below zero. The final card shows your finds, time, and scenes explored.
- A **Perfect!** run requires finding every Nick in every scene, with zero wrong guesses and zero Wally finds. It awards an extra **500 points** at the end. The current eleven-Nick game therefore has a perfect total of **1600 points**. The badge and bonus appear on both the result card and downloaded PNG. Skipping a Nick or making any mistake disqualifies the bonus. The bonus amount is configurable as `perfectBonus` in `src/game-config.js`.
- The timer measures active searching. It pauses during image loading and decoding, in dialogs, during a break, and when the browser tab is hidden. Lower time breaks a tied score.
- Drag to pan, scroll or pinch to zoom, and click/tap to guess. Buttons zoom and reset the image.
- With the scene focused, `+` and `-` zoom, arrow keys pan, Enter or Space guesses at the center crosshair, and `0` resets the view.
- Sound is optional and starts muted. Reduced-motion preferences simplify effects. The scorecard downloads as a PNG. Replay clears the game and keeps your name.

## Publish to GitHub Pages

The private repository is `eugenioenko/where-is-nick`. Push changes to `main` to publish through the **Publish Where is Nick?** workflow. For a fork or another repository:

1. Open the repository's **Settings → Pages** and select **GitHub Actions** as the publishing source.
2. Run **Publish Where is Nick?** from Actions, or push another commit to `main`.
3. The workflow installs pnpm and Node, builds `docs/`, tests the production site on desktop and mobile, and uploads and deploys the `docs/` artifact. Pull requests build and test without deployment.

The generated asset paths are relative, so the site works at `https://eugenioenko.github.io/where-is-nick/` and at a custom domain without changing the build.

### Your custom domain

Set the domain in **Settings → Pages → Custom domain**. For a subdomain such as `journey.example.com`, create a DNS CNAME pointing to `OWNER.github.io` (with no repository path). For an apex domain, use the A/AAAA or ALIAS/ANAME records in GitHub's current documentation. When DNS is ready, enable **Enforce HTTPS** in Pages settings.

With an Actions deployment, configure the domain through Pages settings; GitHub does not require a `CNAME` file in the built artifact. See [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

The workflow follows [GitHub's custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's relative-base build support](https://vite.dev/guide/build#relative-base).

## License

The application source is licensed under the [MIT License](LICENSE). The supplied illustrations in `images/` retain their original rights. Bundled fonts use the SIL Open Font License; their notices are in `public/fonts/`.
