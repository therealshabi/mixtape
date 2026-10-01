# Mixtape for you

A cassette-style mixtape you can send to someone. Same flow as the original [Replit app](https://mixtape-for-you.replit.app/) — pick a tape color, add stickers, paste YouTube links, write a note — with **Side A and Side B**, up to **10 songs each**.

No account. No database. Share links encode the mixtape in the URL, so it hosts for free as a static site.

## Run locally

Needs Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open the printed localhost URL.

## Host for free

Build:

```bash
npm run build
```

Then drop the `dist/` folder on any static host.

### Cloudflare Pages

1. Connect this repo
2. Build command: `npm run build`
3. Output directory: `dist`

### Netlify

Same build settings. `public/_redirects` already sends every route to `index.html`.

### GitHub Pages

1. Settings → Pages → GitHub Actions, or deploy `dist/`
2. `public/404.html` restores `/create` and `/m/...` links after refresh

Share URLs look like `/m/<payload>`. Anyone with the link can open the tape and play the tracks.
