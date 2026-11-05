# Sudipta and Nitesh — Wedding Invitation

A wedding-only invitation built with Next.js, TypeScript, GSAP and Tailwind CSS.

## Local development

Install dependencies with `npm install`, then run `npm run dev`. Use `npm test` and `npm run build` to verify the project. Wedding details are configured in `lib/config.ts`.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the static site with the `/Sudipta` base path and deploys it to GitHub Pages. In repository settings, select GitHub Actions as the Pages source.

The opening photo is loaded from a public Drive folder; run `python3 scripts/sync-drive-photos.py` locally to refresh its checked-in photo list before deployment.
