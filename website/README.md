# ML Claw website

Landing page for [ML Claw](https://github.com/osolmaz/mlclaw), built with
[Astro](https://astro.build) as a static site. It is served with GitHub Pages
at <https://osolmaz.github.io/mlclaw/>.

## Develop

```bash
cd website
npm install
npm run dev
```

## Build

```bash
npm run build
```

The static site is written to `website/dist/`.

## Deploy

Pushes to `main` that touch `website/` trigger the
[`deploy-website` workflow](../.github/workflows/deploy-website.yml), which
builds the site and publishes it to GitHub Pages. The repository's Pages
source must be set to "GitHub Actions" (Settings → Pages). You can also run
the workflow manually:

```bash
gh workflow run deploy-website.yml
```

The site is served under the `/mlclaw` base path, so asset URLs in pages must
be prefixed with `import.meta.env.BASE_URL`. If the site moves to a custom
domain later, update `site` and remove `base` in `astro.config.mjs`.
