# Provider Adapter Template

Use `scripts/create-provider.mjs` to scaffold a disabled provider boundary:

```bash
node scripts/create-provider.mjs provider-id
```

The generator creates:

- `src/data/providers/provider-id.js`
- `tests/fixtures/provider-id/README.md`
- `docs/PROVIDER_ID.md`

The generator does not register, enable, or call the provider. After scaffolding, add source registry entries, schedule metadata, capability metadata, tests, documentation, `.env.example` variables, and safe failure handling before enabling runtime calls.

Every provider must:

- Keep credentials server-side.
- Return sanitized errors.
- Report source status and freshness.
- Include attribution and source URLs.
- Avoid raw copyrighted bodies unless explicitly allowed.
- Fail visibly when configuration or upstream service is unavailable.
