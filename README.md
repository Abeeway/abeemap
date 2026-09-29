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

