# Event Photos
The GitHub Pages build embeds the shared Google Drive folders when a photo service is not configured. To enable the native grid, empty-folder message, recursive chronological gallery, and original photo downloads, deploy this repository's `server/` directory to a Node-compatible Vercel project and use its public `/api/event-photos` URL as the GitHub Actions repository variable `NEXT_PUBLIC_EVENT_PHOTOS_ENDPOINT` on all three repositories. Rerun their Pages workflows.

The local API runs with `node scripts/preview-event-photos.mjs` from the repository root after installing dependencies in `server/`. Set `NEXT_PUBLIC_EVENT_PHOTOS_ENDPOINT=http://127.0.0.1:3009/api/event-photos` for the local build.

The Drive folder and its event subfolders must be accessible to guests by link. Optional server-side `GOOGLE_DRIVE_API_KEY` enables the official Drive listing, pagination, and creation-time fallback. Without it, the gallery uses public folder listings and capture metadata from the originals. The gallery does not store photo originals or copy them into this repository.
