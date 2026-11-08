# Fieldwork Supply

A fictional outdoor-gear storefront, built as a portfolio demo. Static site, no build step, no
dependencies: plain HTML, CSS and ES modules, served by Caddy in Docker.

## Layout

```
dist/                  everything that ships (this folder is copied into the image)
  index.html           semantic markup, skip link, landmarks
  style.css            design tokens + cascade layers (see the header comment)
  js/
    catalog.js         product data; pure filter / sort / URL-state functions
    cart.js            pure bag logic (cents, limits, sanitising) + storage load/save
    format.js          money and plural helpers (integer cents, cached Intl formatters)
    dom.js             html`` template tag that escapes every interpolation
    main.js            wires the modules to the page; one delegated click handler
tests/                 browser test suite (not shipped)
Dockerfile, Caddyfile, compose.yaml
```

## Run

```sh
docker compose up -d --build      # http://127.0.0.1:8088, see DOCKER.md
```

or, for quick edits, serve `dist/` with anything static: `python3 -m http.server -d dist`.

## Test

```sh
tests/run.sh                      # headless Chrome; needs python3 and Google Chrome
```

Or open `tests/` through any static server to see the results in a browser. There is nothing to
install. The suite has unit tests for the pure modules and integration tests that load the real
page in an iframe and use it like a visitor would: filtering, sorting, shareable URLs, the bag,
quantity limits, cross-tab sync, checkout, dialogs, and accessibility and overflow checks.

## Design notes

- **State and URL.** The category and sort live in the URL (`?category=Camp&sort=low`), so views
  are shareable and survive a reload. Invalid values fall back to defaults.
- **Money is integer cents** everywhere, formatted once at the edge.
- **The bag** is `{ productId: quantity }` in `localStorage` (key unchanged from v1, so existing
  bags carry over). Loading sanitises it, quantities are capped at 9, and it syncs across tabs.
- **No injection.** Every interpolated value in a template is escaped; `mount()` refuses plain
  strings. Combined with the Content-Security-Policy in the Caddyfile (no inline script or style),
  injected markup can neither render nor run.
- **Accessibility.** Skip link, landmarks, labelled dialogs, focus kept on the control you used,
  announcements for bag changes, focus rings with at least 3:1 contrast on every surface, control
  borders at 3:1, and no touch target under 24px.
- **Styling.** One token set (colour, type scale, space, shape, motion) in cascade layers. Pills
  are for navigation and toggles, square corners for actions and inputs.

## Known limits

- Products are rendered by JavaScript; without it the page shows a notice instead of the shop.
- Assets are not fingerprinted, so they are cached for only five minutes.
- Mouse-sized controls are 40px; they grow to 44px on touch screens.
