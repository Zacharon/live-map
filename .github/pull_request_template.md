## Summary

-

## Checks

- [ ] I ran `npm run check`, or documented why it could not run locally.
- [ ] I ran relevant security/validator checks, or documented why they could not run locally.
- [ ] I did not run production deploy commands.
- [ ] I did not run `wrangler deploy`.

## Safety

- [ ] No secrets, `.env` files, private auth emails, tokens, keys, or credential-like placeholders were added.
- [ ] Browser code does not receive credentialed provider calls or private provider credentials.
- [ ] Public claims remain cautious: no complete real-time global coverage, no emergency reliance, and no professional-advice claims.

## Platform Impact

- [ ] Cloudflare Worker/API route impact is described, or this PR has no Cloudflare route impact.
- [ ] Netlify compatibility is preserved, including existing compatibility routes where relevant.
- [ ] Unknown `/api/*` behavior remains JSON-safe where Worker routing is involved.

## Data And Providers

- [ ] Provider attribution, source URLs, freshness, and source status remain visible.
- [ ] Degraded, delayed, configuration-required, disabled, fallback, and partial-data states remain honest.
- [ ] Planned, fixture, unavailable, or credential-gated providers are not labeled live.
