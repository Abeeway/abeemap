# Code review — 1 October 2026

Reviewed authentication, HTTP services, MQTT processing, map rendering/lifecycle,
logging, build configuration, and deployment. Application code was not changed.
Findings below come from source inspection; no live ThingPark account or broker
was used, and security scenarios were not exercised against a deployed site.

## Findings, in priority order

### 1. Fixed: login could send the access token to an arbitrary return URL

The original login implementation read `redirect_uri` directly from the query
string. Both login branches appended the returned access token and navigated
there. A crafted login link with an attacker-controlled HTTPS return URL could
receive the token if the user signed in.

Implemented in [`login-return-url.ts`](src/app/auth/login-return-url.ts) and
[`login.component.ts`](src/app/components/login/login.component.ts): validate the
application origin, base path, HTTP(S) scheme, and allowed return routes before
requesting a token. Reject missing/mismatched session state. Both platform login
branches establish the local session and reload the validated destination without
adding the token to its URL. Regression tests cover unsafe URLs, valid deep links,
missing parameters/state, and both login branches.

Compatibility follow-up: direct `/login` visits start a local state handshake;
development login URLs use the current application base URL rather than a
hardcoded host/port. Invalid or expired links offer a fresh local login through
the "Start again" action while retaining return-URL and callback state validation.

### 2. Fixed: Leaflet rendered external values as HTML

The original map interpolated MQTT fields into popup HTML and passed external
device/beacon names to Leaflet string tooltips. Leaflet interpreted those strings
as HTML outside Angular's template escaping, permitting injected elements and
event handlers from untrusted messages, imports, or configured names.

[`leaflet-map.service.ts`](src/app/services/leaflet-map.service.ts) now builds
device popup DOM nodes using text nodes and explicit line breaks. Device and
beacon tooltips use `textContent` at creation, late configuration loading, and
rename/update paths. MQTT display fields and imported beacon name types are
checked before rendering. Browser regression tests confirm HTML-like fields and
names remain literal text and produce no injected executable elements.

### 3. Fixed: expired sessions remained authenticated and malformed JWTs crashed restoration

The original session restoration decoded JWTs without catching exceptions and
recorded `exp` without checking it. Malformed storage could crash startup, and
expired sessions were accepted by the routing guard.

[`auth.service.ts`](src/app/auth/auth.service.ts) now catches decoding failures,
requires a numeric finite future expiry within the supported date range, and
clears invalid cached sessions. Active sessions expire through a cancellable
timer and restart login; long-lived tokens use bounded timer intervals. Routing
and HTTP interception independently recheck the clock so delayed background
timers cannot allow expired routes or bearer headers. Invalid login responses
show an error without consuming state needed for a retry. Tests cover startup,
expiry boundaries, active expiry, timer replacement/cleanup/overflow, routing,
and HTTP headers. Server-side token verification remains authoritative.

### 4. Fixed: API failures could enter mutation success handlers

The original error handler assumed a nested error message, classified failures
using body codes, and emitted `undefined` as success for 401/403 responses. A
failed connector deletion could consequently remove an item from the UI. Its
login snackbar action was unimplemented.

[`service-utils.service.ts`](src/app/services/service-utils.service.ts) now safely
formats network, OAuth, nested-message, text, and missing-body errors, classifies
authentication errors by HTTP status, and rethrows the original error without a
success emission. The Login action clears the session and starts local login.
Callers preserve that snackbar instead of replacing it, and display normalized
messages for other errors. Beacon overwrite now recognizes missing maps by HTTP
404 status. Regression tests cover error formats, status/body disagreement,
the login action, and failed versus successful connector deletion.

### 5. Fixed: valid zero coordinates were dropped; invalid coordinates were accepted

The original coordinate filter used truthiness, dropping locations on the
equator or prime meridian while accepting strings and out-of-range numbers.

[`mqtt-client.service.ts`](src/app/services/mqtt-client.service.ts) now requires
an array with finite numeric longitude in [-180, 180] and latitude in [-90, 90].
Zero, negative values, boundaries, and optional altitude remain valid; coordinate
order is preserved. Invalid locations remain available in the message log but
are excluded from location updates. Tests cover valid/invalid types, ranges,
numeric overflow, and continued processing after a rejected location.

### 6. Fixed: quick map navigation could destroy an uninitialized map

Both map components originally used untracked initialization timers and
unconditionally disposed their map, throwing if navigation occurred before
initialization and allowing a late timer to run on a destroyed view.

Both views now initialize synchronously in `ngAfterViewInit` using their own
`ViewChild` element. Disposal guards an absent map and fires Leaflet's unload
event before removing remaining listeners. Destroyed maps are removed from the
pending floorplan queue. Browser regression tests exercise pre-initialization
disposal, repeated quick route changes, duplicate container IDs, and floorplan
responses arriving before or after map destruction.

### 7. Fixed: component cleanup unsubscribed a shared authentication Subject

The original navigation cleanup closed the service's shared authentication
stream and left its breakpoint and MQTT subscriptions active.

[`navigation.component.ts`](src/app/components/navigation/navigation.component.ts)
now owns all three subscriptions in a composite subscription and releases them
on destruction. Its replayed breakpoint stream uses reference counting so the
upstream observer is also released. Tests verify the destroyed view stops
receiving updates, shared streams remain usable, and a replacement view receives
current state.

### 8. Fixed: disconnect did not cancel a pending MQTT connection

The original disconnect returned early before a connection was established,
leaving delayed/connecting clients alive. Dropped connections required manual
reconnect, and the one-shot connect listener could not handle reconnection.

[`mqtt-client.service.ts`](src/app/services/mqtt-client.service.ts) now cancels
pending timers and force-ends clients regardless of connection state, with the
same cleanup on service destruction. Transport interruptions retry every five
seconds and explicitly resubscribe on every connection; authentication refusals
stop and require user intervention. Explicit disconnect stops automatic retries.
Client identity and connection-generation checks reject stale events and
subscription acknowledgements. The navigation toggle can cancel a pending
attempt. Tests use an injected MQTT connector with simulated client events to
cover cancellation, shutdown, transport loss, refusal, replacement, stale
acknowledgements, and manual reconnect without accessing a live broker.

### 9. Fixed: message history grew without a limit

The original log retained every MQTT message for the application's lifetime,
increasing memory and table update costs, and initialized its observable with
an object instead of a collection.

[`logs.service.ts`](src/app/services/logs.service.ts) now retains only the latest
500 messages, newest first, and evicts the oldest on each new message. It uses
typed records, starts with `[]`, exposes a read-only observable, and copies
messages instead of modifying the shared MQTT payload. Initialization is
idempotent and service destruction releases the MQTT subscription. Regression
tests cover the 500/501 boundary, sustained traffic, ordering, snapshot/payload
isolation, repeated initialization, and cleanup. A future total byte limit could
also bound memory for unusually large individual messages; paging/virtual
scrolling would reduce rendering costs if the retained-message limit increases.

## Further improvements

- Fixed: [`auth.interceptor.ts`](src/app/auth/auth.interceptor.ts) scopes bearer
  headers to the selected platform's API origin and base path, with a path boundary
  check. Relative URLs resolve against the document base URL. Static assets,
  other platform APIs, unrelated paths/origins, and invalid platform selections
  receive no session token. Full response logging is removed. Regression tests
  cover allowed and excluded requests, session expiry, caller-provided headers,
  sensitive response handling, and HTTP errors. The production build and all
  336 ChromeHeadless tests passed.
- Fixed: login uses the existing `jwtDecode` decoder through
  [`login-token.ts`](src/app/auth/login-token.ts), supporting base64url and UTF-8
  payloads. DX subscriber scopes and Keycloak subscription/subject claims are
  validated before building MQTT topics or saving credentials. Malformed token
  responses show a sign-in error. Regression tests cover both ecosystem and
  preview platforms. The login form handles submission through `ngSubmit`, shows
  pending requests and inline errors, and prevents duplicate submissions. Tests
  exercise the rendered form, button clicks, validation, and failed responses;
  the production build and all 276 ChromeHeadless tests passed, including server
  connection failures, HTTP 503 responses, and retry after either failure. The
  user confirmed TPXLE Community login works after restoring server availability;
  the reported login failure was a server outage. The form changes remain useful
  for submission and feedback during future failures.
- Extract typed MQTT messages, API responses, and beacon properties. Split the
  814-line Leaflet service into rendering, configuration, and beacon persistence
  responsibilities once the behavior defects have regression coverage.
- Remove duplicated shared configuration between the two environment files while
  retaining production base-href URL resolution and platform-specific settings.
- Fixed: login and the API-key creation/reset dialog offer a “Remember MQTT API
  key on this device” checkbox, enabled by default. Existing saved keys remain
  remembered. Opting out immediately removes the local-storage copy, keeps the
  key in session storage for reloads, and clears it on logout or session expiry.
  The preference persists; opting back in restores persistent storage. Both key
  entry paths use [`mqtt-api-key-storage.ts`](src/app/auth/mqtt-api-key-storage.ts).
  Tests cover both choices, migration, reload, logout/expiry, and the rendered
  checkbox. The production build and all 353 ChromeHeadless tests passed.
- Fixed: zoom-to-devices/beacons now checks `bounds.isValid()` before computing
  the center, leaving the view unchanged when feature groups have no valid bounds.
  The satellite tile URL now uses HTTPS. Eight regression tests cover empty groups,
  empty polygon layers, valid bounds, and zero coordinates for both zoom actions.
- Fixed: the [Pages workflow](.github/workflows/deploy-pages.yml) runs
  `npm run test:ci` after dependency installation and before the production build
  and artifact upload. Failed tests block deployment. The suite now also covers
  auth expiry and bearer scope, login claim validation and form failures, MQTT
  connection lifecycle, bounded logs, API errors, and map bounds/lifecycle.
- Fixed: the README now uses `npm run build` and documents `dist/abeemap/`.
  Roboto and Material Icons are bundled locally with upstream licenses, removing
  external font retrieval from production builds and browser font loading.

## Validation

- Used Node 22.22.3 from `.nvmrc`.
- `npm run test:ci`: **12 tests passed** in ChromeHeadless. The sandbox initially
  blocked Karma's port; rerunning with approved sandbox escalation succeeded.
- `npm run build`: **passed**, with an initial bundle of 1.68 MB, below the
  configured budgets. The first sandbox run could not resolve Google Fonts;
  rerunning with approved network access succeeded.
- An intermediate build with optimization disabled compiled the application but
  exceeded production bundle budgets. It was not used as production validation.
- No browser interaction checks or backend integration tests were performed.
