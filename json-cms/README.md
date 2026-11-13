# Content Studio (JSON CMS)

Live: **https://sendtodesk.pages.dev/json-cms/**

Looks like a normal content editor for employees/clients. Data is still JSON in R2.

## Features

- Structured forms (not “JSON jargon” by default)
- HTML editor for blog/pages (`body`, `html`, `content`…) with toolbar + Preview
- Smart fields: text, long text, HTML, link, email, date, color, number, toggle, sections, lists
- List cards with reorder / duplicate / remove
- **Load demos** samples: settings, blog, ads, pages, FAQ, team, all-types-demo
- Advanced tab only for developers

## Cloudflare setup

1. R2 bucket `json-cms-content` bound as `CONTENT`
2. Secrets: `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`
3. Deploy this repo (Functions at repo root)

## Public read

`https://sendtodesk.pages.dev/content/blog.json`
