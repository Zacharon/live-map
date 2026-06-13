# Replit Workflow Safety

Use Replit as a development workspace only. Do not deploy, merge pull requests, or push directly to `main` from Replit-driven work.

Safe workflow:

- Work on `feature/replit-live-map-workflow` or another focused feature branch.
- Keep changes small, reviewable, and limited to the requested area.
- Do not run `wrangler deploy`, Netlify deploy commands, Vercel deploy commands, Cloudflare deployment commands, build hooks, or deployment APIs.
- Preserve Netlify static hosting compatibility and existing API routes such as `/api/events` and `/.netlify/functions/events`.
- Keep provider integrations server-side and keep secrets out of frontend code.
- Run the lightest relevant checks before opening or updating a pull request when terminal access is available.
