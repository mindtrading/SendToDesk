# JSON CMS (SendToDesk এর সাথে)

লাইভ URL: **https://sendtodesk.pages.dev/json-cms/**

এই অ্যাডমিন একই Cloudflare Pages প্রজেক্টে চলে। UI আছে `json-cms/` ফোল্ডারে; API আছে রুটের `functions/` এ (`/api/*`, `/content/*`)।

## Cloudflare সেটআপ (একবার)

1. **R2** → Create bucket: `json-cms-content`
2. Pages প্রজেক্ট **sendtodesk** → **Settings → Bindings** (বা Functions → R2):
   - Binding name: `CONTENT`
   - Bucket: `json-cms-content`
3. **Environment variables** (Production + Preview):
   - `ADMIN_USER` = `admin`
   - `ADMIN_PASSWORD` = আপনার পাসওয়ার্ড
   - `SESSION_SECRET` = লম্বা র‍্যান্ডম স্ট্রিং
4. Redeploy / Git push

## ব্যবহার

1. খুলুন: https://sendtodesk.pages.dev/json-cms/
2. লগইন
3. **Seed samples** → `site-settings.json`, `ads.json`, `blog.json`
4. এডিট → **Save**
5. পাবলিক JSON: https://sendtodesk.pages.dev/content/blog.json

## স্ট্যাটিক সাইট থেকে ফেচ

```js
const res = await fetch("https://sendtodesk.pages.dev/content/site-settings.json");
const settings = await res.json();
```

## লোকাল

```bash
# রেপো রুট থেকে
cp json-cms/.dev.vars.example .dev.vars
# .dev.vars এ পাসওয়ার্ড সেট করুন
npx wrangler pages dev . --r2=CONTENT
```

তারপর: http://localhost:8788/json-cms/
