## Prerequisites

This Angular 22 version uses Node.js 22. Use the version pinned in `.nvmrc`:

```bash
nvm install
nvm use
npm ci
```

## Development server
Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build
Run `ng build --build-optimizer --base-href /abeemap/` to build the project.  
The build artifacts will be stored in the `dist/` directory.
Configure your web-server so that index.html is served from the `/abeemap` resource path.  
E.g.: `https://example.com/abeemap`

## GitHub Pages

Pushes to `main` are built and deployed by
`.github/workflows/deploy-pages.yml`. The site is published at:

https://abeeway.github.io/abeemap/

Before the first deployment, open the repository's **Settings → Pages** and
select **GitHub Actions** as the source. You can also start a deployment
manually from the workflow's **Run workflow** button.

The deployment creates a `404.html` copy of the application shell so that
direct links to Angular routes continue to work on GitHub Pages.

## Device names

Device display names can be configured in `src/assets/device-names.jsonc`.
JSONC supports `//` comments and trailing commas, so examples or temporarily
unused entries can remain commented out:

```jsonc
{
  "20635F0421000C1E": { "name": "Norbert" },
  // "20635F02410011FC": { "name": "Pia" },
}
```

Device EUIs are matched case-insensitively. The file is loaded at runtime, so
it can also be replaced directly in a deployed app's `assets` folder without
recompiling the application; reload the page to use the new values.

## Floorplan overlays

Floorplan images and their map placement are configured in
`src/assets/floorplans.jsonc`:

```jsonc
[
  {
    "id": "actility-office",
    "name": "Actility office",
    "image": "assets/actility_floorplan.png",
    "bounds": [
      [48.87459, 2.33358],
      [48.87488, 2.33413],
    ],
    "zoom": 19,
    "default": true,
  },
]
```

Bounds are the southwest and northeast corners in `[latitude, longitude]`
order. `zoom` is optional and defaults to 19. The first entry marked as
`default` is selected initially; if none is marked, the first entry is used.
Each entry automatically creates an image overlay and a corresponding map
button. JSONC comments and trailing commas are supported; wrap an entire entry
in `/* ... */` to temporarily remove its overlay and button.
