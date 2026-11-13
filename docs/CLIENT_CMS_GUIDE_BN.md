# ক্লায়েন্ট ওয়েবসাইট + CorePanel — সম্পূর্ণ গাইড

এই গাইডটা **মার্কেটার / ফ্রিল্যান্সার** হিসেবে ক্লায়েন্টকে সাইট দিবেন, আর কনটেন্ট এডিট করার জন্য এই JSON CMS (CorePanel) সেটআপ ও কানেক্ট করবেন — সেই পুরো ছবি।

---

## ১) পুরো সিস্টেম কীভাবে কাজ করে (সহজ ছবি)

```
┌─────────────────────┐         ┌──────────────────────────┐
│  ক্লায়েন্টের সাইট    │  fetch  │  CorePanel backend  │
│  (HTML/CSS/JS)      │ ──────► │  /content/*.json         │
│  sendtodesk.pages…  │         │  (Cloudflare Pages Fn)   │
└─────────────────────┘         └────────────┬─────────────┘
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │  R2 Object     │
                                    │  Storage       │
                                    │  content/…json │
                                    └────────┬───────┘
                                             ▲
                                             │ Save
                                    ┌────────┴───────┐
                                    │  /json-cms/    │
                                    │  Admin login   │
                                    │  (ক্লায়েন্ট/আপনি)│
                                    └────────────────┘
```

**তিন ভাগ:**

| ভাগ | কাজ | কে ব্যবহার করে |
|-----|-----|----------------|
| **পাবলিক সাইট** | ভিজিটর দেখে | সবাই |
| **CorePanel** (`/json-cms/`) | কনটেন্ট এডিট/সেভ | আপনি বা ক্লায়েন্ট |
| **R2** | সব JSON ফাইল জমা | সার্ভার (লুকানো) |

ক্লায়েন্ট **কোড ছোঁয় না** — শুধু Studio তে লগইন করে টেক্সট/ইমেজ বদলায় → Save → সাইটে লাইভ।

---

## ২) ক্লায়েন্টের জন্য ওয়েবসাইট কীভাবে বানাবেন

### ধাপ A — সাইট ডিজাইন/বিল্ড

1. সাধারণ স্ট্যাটিক সাইট বানান (HTML/CSS/JS) — যেমন SendToDesk।
2. যে জায়গাগুলো ক্লায়েন্ট বদলাবে, সেগুলো **হার্ডকোড না রেখে** JSON থেকে আনবেন:
   - সাইট নাম, ট্যাগলাইন, ইমেইল
   - Hero টাইটেল/সাবটাইটেল/বাটন
   - ডাউনলোড লিংক / ভার্সন
   - ব্লগ পোস্ট, FAQ, পেজ টেক্সট

3. সাইটের JS এ এরকম কানেক্ট:

```js
const CMS = "https://CLIENT-DOMAIN.pages.dev/content";

async function load(file) {
  const res = await fetch(CMS + "/" + file);
  if (!res.ok) return null;
  return res.json();
}

const settings = await load("site-settings.json");
const blog = await load("blog.json");

// তারপর DOM এ বসান
if (settings?.hero?.title) {
  document.querySelector("[data-cms='hero-title']").textContent =
    settings.hero.title;
}
```

4. HTML এ হুক রাখুন:

```html
<h1 data-cms="hero-title">Fallback title</h1>
<p data-cms="hero-subtitle">Fallback text</p>
```

**Fallback গুরুত্বপূর্ণ** — CMS/R2 ডাউন হলেও সাইট ভাঙবে না।

### ধাপ B — কোন JSON লাগবে (টেমপ্লেট)

| ফাইল | ব্যবহার |
|------|---------|
| `site-settings.json` | নাম, hero, ডাউনলোড, ইমেইল |
| `blog.json` | ব্লগ পোস্ট |
| `faq.json` | প্রশ্নোত্তর |
| `pages.json` | About ইত্যাদি পেজ |
| `ads.json` | অ্যাড স্লট (ঐচ্ছিক) |
| `team.json` | টিম মেম্বার (ঐচ্ছিক) |

Studio তে **New content** বা **Setup wizard** দিয়ে এগুলো তৈরি হয়।

---

## ৩) Backend (CorePanel) সেটআপ — প্রতি ক্লায়েন্ট

**গুরুত্বপূর্ণ সিদ্ধান্ত:**  
এক ক্লায়েন্ট = **আলাদা** Cloudflare Pages প্রজেক্ট + **আলাদা** R2 বাকেট।  
তাহলে এক ক্লায়েন্টের ডেটা অন্যের সাথে মিশবে না।

### ৩.১ Cloudflare এ একবার করে (প্রতি ক্লায়েন্ট)

1. **R2 → Create bucket**  
   উদাহরণ নাম: `clientname-content`

2. **Pages → Create project**  
   - এই রেপো (বা ক্লায়েন্টের ফর্ক) কানেক্ট করুন  
   - Production branch: `main`  
   - Build: সাধারণত খালি / static  

3. **Settings → Bindings → R2**  
   - Variable name: `CONTENT` ← নামটা ঠিক এটাই হতে হবে  
   - Bucket: `clientname-content`

4. **Settings → Environment variables** (Production, টাইপ = **Secret**):

   | Variable | উদাহরণ | নোট |
   |----------|--------|------|
   | `ADMIN_USER` | `admin` | লগইন ইউজার |
   | `ADMIN_PASSWORD` | শক্ত পাসওয়ার্ড | ক্লায়েন্টকে দেবেন |
   | `SESSION_SECRET` | লম্বা র‍্যান্ডম ইংরেজি | লগইনে লাগে না |

5. **Deploy** (Save এর পর Redeploy / নতুন push)

6. অ্যাডমিন URL খুলুন:  
   `https://CLIENT-PROJECT.pages.dev/json-cms/`

### ৩.২ প্রথম লগইন = Setup Wizard

1. Username / Password দিয়ে Sign in  
2. **First-time setup** wizard আসবে (R2 খালি হলে)  
3. Site name, email, download links, starter packs বেছে **Install now**  
4. R2 তে লাইভ JSON তৈরি হবে  
5. **Open CorePanel** → এডিট শুরু

পরে আবার wizard চাইলে (টেস্ট): অ্যাডমিন লগইন করে API `POST /api/setup/reset` (বা ডেভকে বলুন রিসেট করতে)।

---

## ৪) সাইটের সাথে Backend কানেক্ট (সম্পূর্ণ)

### ৪.১ পাবলিক URL (লগইন লাগে না)

```
https://CLIENT-PROJECT.pages.dev/content/site-settings.json
https://CLIENT-PROJECT.pages.dev/content/blog.json
https://CLIENT-PROJECT.pages.dev/media/...   ← আপলোড করা ইমেজ
```

যেকোনো ডোমেইন থেকে `fetch` করা যায় (CORS খোলা)।

### ৪.২ ক্লায়েন্ট সাইটে কানেক্ট চেকলিস্ট

- [ ] `CMS` বেস URL ঠিক আছে (`…/content`)
- [ ] ব্রাউজারে সরাসরি JSON URL খুলে দেখা যায়
- [ ] সাইট JS `fetch` করে DOM আপডেট করে
- [ ] Studio তে Save → ১ মিনিটের মধ্যে (বা soft refresh) সাইটে দেখা যায়  
  (`Cache-Control: max-age=60`)

### ৪.৩ কাস্টম ডোমেইন (ঐচ্ছিক)

Cloudflare Pages → Custom domains → `www.client.com`  
তাহলে:

- সাইট: `https://www.client.com/`
- Studio: `https://www.client.com/json-cms/`
- JSON: `https://www.client.com/content/blog.json`

একই প্রজেক্টে সাইট + CMS রাখলে কানেক্ট সবচেয়ে সহজ (যেমন এখন SendToDesk)।

---

## ৫) ক্লায়েন্টকে কী দেবেন (হ্যান্ডওভার)

1. **সাইট URL** — পাবলিক  
2. **Studio URL** — `…/json-cms/`  
3. **Username / Password**  
4. ছোট নির্দেশ:
   - Login → বাম পাশে ফাইল সিলেক্ট → এডিট → **Save changes**
   - ব্লগের জন্য `blog.json`
   - সাইট নাম/hero এর জন্য `site-settings.json`
   - ভুল হলে **History → Restore**
5. বলবেন না: R2, JSON, Cloudflare (প্রয়োজন নেই)

---

## ৬) দুই ধরনের ডেলিভারি মডেল

### মডেল ১ — এক প্রজেক্টে সাইট + CMS (সহজ, SendToDesk স্টাইল)

```
repo/
  index.html          ← পাবলিক সাইট
  assets/js/site.js   ← /content/ থেকে fetch
  json-cms/           ← অ্যাডমিন UI
  functions/          ← API + R2
```

**কখন:** ছোট ল্যান্ডিং + ব্লগ, এক ডোমেইন।

### মডেল ২ — সাইট আলাদা, CMS আলাদা

- সাইট: Netlify / অন্য হোস্ট  
- CMS: `client-cms.pages.dev`  
- সাইট JS তে: `fetch("https://client-cms.pages.dev/content/blog.json")`

**কখন:** সাইট অন্যখানেই হোস্ট করতে হবে।

---

## ৭) নতুন ক্লায়েন্ট — দ্রুত চেকলিস্ট (কপি করে ব্যবহার করুন)

```
[ ] রেপো ফর্ক / কপি (বা নতুন branch + আলাদা Pages প্রজেক্ট)
[ ] R2 বাকেট তৈরি
[ ] Pages binding: CONTENT → সেই বাকেট
[ ] Secrets: ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET
[ ] Deploy
[ ] /json-cms/ লগইন → Setup wizard → Install
[ ] পাবলিক সাইটে CMS URL কানেক্ট
[ ] Save টেস্ট → সাইটে দেখা যাচ্ছে কিনা
[ ] ক্লায়েন্টকে URL + পাসওয়ার্ড হ্যান্ডওভার
```

---

## ৮) আপনার লাইভ উদাহরণ (SendToDesk)

| জিনিস | URL |
|--------|-----|
| পাবলিক সাইট | https://sendtodesk.pages.dev/ |
| CorePanel | https://sendtodesk.pages.dev/json-cms/ |
| Settings JSON | https://sendtodesk.pages.dev/content/site-settings.json |
| Blog JSON | https://sendtodesk.pages.dev/content/blog.json |

সাইটের `assets/js/site.js` ইতিমধ্যে এই JSON ফেচ করে hero/blog দেখায়।

---

## ৯) সমস্যা হলে

| সমস্যা | কারণ / সমাধান |
|--------|----------------|
| Login “Wrong password” | Cloudflare Secret ভুল / Redeploy হয়নি |
| Login OK কিন্তু ফাইল নেই | R2 binding `CONTENT` নেই |
| `/content/x.json` → 404 | এখনো Save/Install হয়নি, বা ফাইল নাম ভুল |
| সাইটে পুরনো কনটেন্ট | ব্রাউজার ক্যাশ — hard refresh; API তে ~৬০ সেকেন্ড ক্যাশ |
| Wizard আসে না | আগে থেকে JSON আছে — খালি করতে `POST /api/setup/reset` (লগইন সহ) |

---

## ১০) এক লাইনে সারাংশ

**ক্লায়েন্ট সাইট = সুন্দর ফ্রন্ট।**  
**CorePanel = এডিটর।**  
**R2 = ডেটাবেস (JSON ফাইল)।**  
সাইট শুধু `/content/ফাইল.json` ফেচ করে — এটাই কানেক্ট।
