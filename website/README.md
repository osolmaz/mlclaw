# ML Claw website

Landing page for [ML Claw](https://github.com/huggingface/mlclaw), built with
[Astro](https://astro.build) as a static site. It is served with GitHub Pages
at <https://mlclaw.dev/> (custom domain configured in the repository's Pages
settings).

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

Asset URLs in pages are prefixed with `import.meta.env.BASE_URL` so the site
keeps working if it ever moves back under a base path (for example, serving
from `osolmaz.github.io/mlclaw` without the custom domain would need
`base: "/mlclaw"` in `astro.config.mjs`).
