# Repository guidance

## Project and layout

AbeeMap is an Angular/TypeScript browser application for ThingPark integrations,
live MQTT device locations, and editing BLE beacon maps with Leaflet/Geoman.

- `src/app/components/`: views, dialogs, HTML templates, and SCSS. Most components
  belong to `AppModule`; map and Bluetooth map components are standalone and lazy
  loaded by `app-routing.module.ts`. Preserve this distinction when adding imports.
- `src/app/auth/`: session management, login routing guard, and HTTP interceptor.
- `src/app/services/`: ThingPark HTTP APIs, MQTT transport, logs, Leaflet state,
  and marker animation.
- `src/environments/`: development and production configuration. Production
  replaces `environment.ts`; coordinate shared settings in both files.
- `src/assets/device-names.jsonc` and `floorplans.jsonc`: runtime configuration,
  supporting comments and trailing commas. Preserve runtime loading and validation.
- `.github/workflows/deploy-pages.yml`: build and deployment on pushes to `main`.

## Setup and commands

Use Node.js from `.nvmrc` (currently 22.22.3); `package.json` requires Node 22.

```sh
nvm install
nvm use
npm ci
npm run dev
npm run build
npm run test:ci
```

- Production builds use `/abeemap/` as the base href and write to `dist/abeemap`.
  Build scripts and deployment rely on this exact output layout.
- `npm test` starts watch mode; `npm run test:ci` runs Jasmine/Karma once with
  ChromeHeadless. Chrome/Chromium must be installed; set `CHROME_BIN` if necessary.
- `npm run test:coverage` generates coverage in `coverage/abeemap`.
- Font inlining in the production build fetches Google Fonts and requires network
  access. Report environment failures separately from source/compiler failures.
- There is no configured lint script. Do not claim lint validation was performed.

## Implementation conventions

- Follow `.editorconfig`: two spaces, UTF-8, final newlines, and single quotes in
  TypeScript. Keep TypeScript and Angular template strictness enabled.
- Keep service/API responsibilities separate from presentation. Prefer explicit
  interfaces and `unknown` with validation over introducing more `any` values.
- Preserve the existing Angular module/standalone structure unless migration is
  part of the task. Match neighboring component/template/SCSS organization.
- GeoJSON and MQTT coordinates are `[longitude, latitude]`; Leaflet positions and
  floorplan bounds are `[latitude, longitude]`. Zero is a valid coordinate.
- Validate data from MQTT, APIs, imported GeoJSON, and JSONC before using it.
  Use DOM nodes with `textContent` for external values in Leaflet popups/tooltips;
  Leaflet interprets string content as HTML outside Angular template sanitization.
- Scope authorization headers to the intended API origin and path. Avoid logging
  credentials, access tokens, API keys, or complete authentication responses.
- Validate login return URLs and session state. Handle malformed/expired tokens
  without crashing startup; JWT decoding alone is not token verification.
- Clean up component subscriptions, timers, and map listeners on destruction.
  Unsubscribe owned subscriptions, never a shared service's Subject itself.
- Keep long-lived MQTT/map initialization idempotent. Bound retained message
  history and handle disconnects even while a connection is pending.
- Preserve API errors for subscribers; do not turn failed mutations into success
  emissions. Handle HTTP status codes and varying error body shapes explicitly.

## Verification and scope

- For application changes, run `npm run build` and `npm run test:ci` when available.
  Add focused regression tests for changed behavior, especially auth, error
  handling, MQTT validation, and map lifecycle. Tests live alongside source as
  `*.spec.ts`; currently auth, MQTT processing, and marker animation have coverage.
- For map changes, also check route switching, empty layers, floorplan loading,
  marker movement, and beacon editing in a browser when available.
- Documentation-only changes need a diff/format review; avoid unnecessary source
  changes. Report checks actually run and any limitations.
- Do not edit generated `dist/`, dependency `node_modules/`, or `.angular/` output.
  Keep unrelated user changes intact and keep dependency changes intentional.
- `publish` uploads to a remote host; `unpublish` deletes its deployed directory.
  Run them only when deployment/removal is explicitly within the user's request.
  A push to `main` triggers GitHub Pages deployment.
