# JSON CMS (Cloudflare Pages + R2)

জেনেরিক JSON অ্যাডমিন: R2 থেকে সব `.json` দেখায়, টাইপ অটো-ডিটেক্ট করে ফর্ম বানায়, Save/Add/Edit/Delete করা যায়। স্ট্যাটিক সাইট পাবলিক URL থেকে শুধু ফেচ করে।

## দ্রুত সেটআপ

### ১) R2 বাকেট
Cloudflare Dashboard → **R2** → Create bucket  
নাম: `json-cms-content` (বা `wrangler.toml`-এ যা আছে সেটা মিলিয়ে নিন)

### ২) Pages প্রজেক্ট
1. এই ফোল্ডার `json-cms/` আলাদা Pages প্রজেক্ট হিসেবে কানেক্ট করুন  
   - Root directory: `json-cms`  
   - Build command: খালি  
   - Build output: `.` / `/`
2. **Settings → Functions → R2 bucket bindings**  
   - Variable name: `CONTENT`  
   - Bucket: `json-cms-content`
3. **Settings → Environment variables** (Production):
   - `ADMIN_USER` = `admin`
   - `ADMIN_PASSWORD` = শক্ত পাসওয়ার্ড
   - `SESSION_SECRET` = লম্বা র‍্যান্ডম স্ট্রিং

### ৩) ডিপ্লয়
Git push করলেই চলবে, অথবা লোকাল থেকে:

```bash
cd json-cms
npm install
npx wrangler pages deploy . --project-name=json-cms
```

### ৪) প্রথম ব্যবহার
1. `https://YOUR-CMS.pages.dev/` এ লগইন
2. **Seed samples** → `site-settings.json`, `ads.json`, `blog.json`
3. ফাইল খুলে ফর্ম থেকে এডিট → **Save**
4. পাবলিক রিড: `https://YOUR-CMS.pages.dev/content/blog.json`

## স্ট্যাটিক সাইট থেকে ফেচ

```js
const res = await fetch("https://YOUR-CMS.pages.dev/content/site-settings.json");
const settings = await res.json();
document.title = settings.siteName;
```

## লোকাল ডেভ

```bash
cd json-cms
cp .dev.vars.example .dev.vars   # পাসওয়ার্ড সেট করুন
npm install
npm run dev
```

ব্রাউজার: `http://localhost:8788` (পোর্ট wrangler অনুযায়ী)

## API

| Method | Path | Auth | কাজ |
|--------|------|------|-----|
| POST | `/api/login` | না | লগইন |
| POST | `/api/logout` | না | লগআউট |
| GET | `/api/me` | হ্যাঁ | সেশন চেক |
| GET | `/api/files` | হ্যাঁ | সব JSON লিস্ট |
| POST | `/api/files` | হ্যাঁ | নতুন JSON |
| GET | `/api/files/:name` | হ্যাঁ | পড়া |
| PUT | `/api/files/:name` | হ্যাঁ | সেভ |
| DELETE | `/api/files/:name` | হ্যাঁ | ডিলিট |
| GET | `/content/:name` | না | পাবলিক রিড (CORS *) |

R2 কী প্রিফিক্স: `content/your-file.json`
