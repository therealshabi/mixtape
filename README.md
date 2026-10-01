# Mixtape for you

A cassette-style mixtape you can send to someone. Same flow as the original [Replit app](https://mixtape-for-you.replit.app/) — pick a tape color, add stickers, paste YouTube or Spotify links (or a local audio file), write a note — with **Side A and Side B**, up to **10 songs each**.

No accounts. No API keys. Anyone can fork this repo and deploy their own copy.

## Run locally

Needs Node 22 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open the printed localhost URL. Short share ids and hosted files use an in-memory store while Vite is running, so they disappear when you stop the server.

## Deploy

### Full app (short links, photos, local audio) — Netlify

This is the intended host. Netlify Functions + [Blobs](https://docs.netlify.com/blobs/overview/) store short mixtape ids (`/m/d62669a43b`) and uploaded files. Nothing extra to configure: Blobs work on a normal Netlify site with no tokens or env vars.

1. Fork [this repo](https://github.com/therealshabi/mixtape)
2. [Create a Netlify site](https://app.netlify.com/start) from the fork
3. Build command `npm run build`, publish directory `dist`, Node **22** (`netlify.toml` already sets this)

That’s it. After the first deploy, create a mix and share the short `/m/...` link.

Hash links (`/m#eyJ...`) still work on Netlify too. They encode the whole mixtape in the URL, so they don’t need the tape API.

### Static-only (Cloudflare Pages, GitHub Pages, any static host)

```bash
npm run build
```

Publish `dist/`. Share links will be the long `/m#...` form. Short ids, polaroid photo hosting, and local-audio hosting will not persist, because those need the Netlify functions.

GitHub Pages: `public/404.html` restores `/create` and `/m/...` after a refresh.

## Share links

- **Short** — `/m/<id>` after a successful save to `/api/tape` (Netlify Blobs)
- **Long** — `/m#<payload>` encoded in the URL; works on any static host, no server

Anyone with the link can open the tape and play the tracks. YouTube playback still depends on the video allowing embeds.
