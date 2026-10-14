# Where is Nick?

A little farewell-party adventure: enter your name, find Nick in five illustrated scenes, and save your scorecard. Built with React, Vite, and pnpm. All game state stays in the browser; no accounts or backend are needed.

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

`docs/` is generated and ignored by Git. The original artwork stays in `images/`; Vite bundles it into the output. Fonts are served locally, with their OFL licenses in `public/fonts/`.

## Set Nick's real locations

The current game is a **practice edition** with temporary rectangles and visible orange N markers. The targets stay fixed between rounds and replays. They are placeholders, not Nick's actual locations.

1. Run the app and open `http://127.0.0.1:5173/?setup=1`.
2. Pick a scene. Switch to **Pan & zoom** to position the image, then switch back to **Drawing target** and drag a rectangle around Nick. Repeat for all five scenes.
3. Click **Download targets** and replace `src/targets.json` with the downloaded file. It sets `practiceMode` to `false`, which hides the practice markers and messages.
4. Rebuild or push to GitHub to publish the changes.

You can also edit `src/targets.json` directly. A target uses percentages of the original image, with the origin in the top-left corner:

```json
{ "x": 68, "y": 55, "width": 4, "height": 7 }
```

For pixel coordinates, calculate `x / imageWidth * 100`, `y / imageHeight * 100`, and the equivalent for width and height. Keep the rectangle inside the image and include a little tapping room around Nick. This keeps the hit area accurate across devices and zoom levels. The host's setup page is an editing aid, not an authentication boundary: this is a static party game.

Scene titles, image dimensions, order, and scoring settings live in `src/game-config.js`. The number of rounds follows the length of its `rounds` array. Add a target for each new round ID.

## Game rules and controls

- A find earns 100 points, minus 10 per wrong guess and 20 for using the scene's hint. A round never goes below zero; five perfect rounds earn 500 points.
- Hints reveal a broad violet search area once per scene.
- The timer measures active searching. It pauses during image loading and decoding, after a find, in dialogs, during a break, and when the browser tab is hidden. Lower time breaks a tied score.
- Drag to pan, scroll or pinch to zoom, and click/tap to guess. Buttons zoom and reset the image.
- With the scene focused, `+` and `-` zoom, arrow keys pan, Enter or Space guesses at the center crosshair, and `0` resets the view.
- Sound is optional and starts muted. Reduced-motion preferences simplify effects. The scorecard downloads as a PNG. Replay clears the game and keeps your name.

## Publish to GitHub Pages

The public repository is `eugenioenko/where-is-nick`. Push changes to `main` to publish through the **Publish Where is Nick?** workflow. For a fork or another repository:

1. Open the repository's **Settings → Pages** and select **GitHub Actions** as the publishing source.
2. Run **Publish Where is Nick?** from Actions, or push another commit to `main`.
3. The workflow installs pnpm and Node, builds `docs/`, tests the production site on desktop and mobile, and uploads and deploys the `docs/` artifact. Pull requests build and test without deployment.

The generated asset paths are relative, so the site works at `https://eugenioenko.github.io/where-is-nick/` and at a custom domain without changing the build.

### Your custom domain

Set the domain in **Settings → Pages → Custom domain**. For a subdomain such as `farewell.example.com`, create a DNS CNAME pointing to `OWNER.github.io` (with no repository path). For an apex domain, use the A/AAAA or ALIAS/ANAME records in GitHub's current documentation. When DNS is ready, enable **Enforce HTTPS** in Pages settings.

With an Actions deployment, configure the domain through Pages settings; GitHub does not require a `CNAME` file in the built artifact. See [GitHub's custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

The workflow follows [GitHub's custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's relative-base build support](https://vite.dev/guide/build#relative-base).

## License

The application source is licensed under the [MIT License](LICENSE). The supplied illustrations in `images/` retain their original rights. Bundled fonts use the SIL Open Font License; their notices are in `public/fonts/`.
