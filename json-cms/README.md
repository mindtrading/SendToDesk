# Content Studio (JSON CMS)

Live: **https://sendtodesk.pages.dev/json-cms/**

Looks like a normal content editor. Data is JSON in R2. Public site fetches `/content/*.json`.

## Full client guide (Bangla)

**[→ ক্লায়েন্ট সাইট + CMS সেটআপ সম্পূর্ণ গাইড](../docs/CLIENT_CMS_GUIDE_BN.md)**

## Cloudflare (per project)

1. R2 bucket bound as `CONTENT`
2. Secrets: `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`
3. Deploy → `/json-cms/` → first login runs setup wizard

## Public read

`https://YOUR-DOMAIN/content/blog.json`
