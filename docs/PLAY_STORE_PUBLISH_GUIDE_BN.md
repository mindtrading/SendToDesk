# SendToDesk — Play Store পাবলিশ গাইড (বাংলায়, ধাপে ধাপে)

এই ফাইলে আছে: কোন স্টোর লিস্টিং কোথায় যাবে, কোন দেশে অ্যাপ ছাড়বেন, কাস্টম স্টোর লিস্টিং কীভাবে বানাবেন, A/B টেস্ট (Store Listing Experiments) কীভাবে চালাবেন, আর পাবলিশের আগে-পরে কী কী চেক করবেন।

Play Console-এর মেনুর নামগুলো ইংরেজিতে রাখা হয়েছে, যাতে স্ক্রিনে মিলিয়ে নিতে পারেন।

---

## ০. এক নজরে — আমাদের কাছে যা আছে

| লিস্টিং | ভাষা | কারা দেখবে | ফাইল |
|---|---|---|---|
| **Main / Default** | English (US) – en-US | পৃথিবীর সব ইউজার, যাদের জন্য আলাদা লিস্টিং নেই | `PLAY_STORE_LISTING_DEFAULT_EN.md` |
| **Custom: India (Hindi)** | hi-IN | ভারতে যাদের ফোনের ভাষা হিন্দি | `PLAY_STORE_ASO_HI.md` |
| **Translation: বাংলা** | bn-BD | বাংলাদেশ + পশ্চিমবঙ্গে যাদের ফোনের ভাষা বাংলা | `PLAY_STORE_ASO_BN.md` |
| কীওয়ার্ড কেন বেছেছি | — | — | `ASO_KEYWORD_STRATEGY.md` |
| স্ক্রিনশট / চেকলিস্ট | — | — | `PLAY_STORE_ASO.md` |

**বর্তমানে কত দেশ যুক্ত আছে** — এটা আমি আপনার Console না দেখে বলতে পারব না। দেখার জায়গা: **Play Console → আপনার অ্যাপ → Release → Production → Countries / regions** ট্যাব। উপরে লেখা থাকবে "Available in X countries / regions"। নতুন অ্যাপে এটা সাধারণত **0** থাকে, নিজে যোগ করতে হয়। নিচের §৪-এ কোন দেশ যোগ করবেন তার লিস্ট দেওয়া আছে।

---

## ১. দুইটা ধারণা আগে বুঝে নিন

### ১.১ Translation বনাম Custom store listing

| | **Translation (অনুবাদ)** | **Custom store listing** |
|---|---|---|
| কোথায় | Main store listing → "Manage translations" | Store presence → Custom store listings |
| কী করে | একই লিস্টিং অন্য ভাষায় | আলাদা লিস্টিং — আলাদা title, short, full, screenshot |
| টার্গেট | শুধু **ভাষা** | **দেশ** বা **ভাষা** বা দুটো একসাথে |
| আমাদের কাজে | hi-IN কে শুধু অনুবাদ করলে হিন্দি ইউজার সারা দুনিয়ায় দেখবে | hi-IN কে **India + Hindi** কাস্টম লিস্টিং করলে শুধু ভারতের হিন্দি ইউজার দেখবে — এটাই চাই |

**আমাদের সিদ্ধান্ত:** হিন্দি লিস্টিং = **Custom store listing (Country: India, Language: Hindi)**। কারণ ভারতের কাফে/স্টুডিও ইউজারের জন্যই লেখা, আর title-ও আলাদা (`SendToDesk: পাসপোর্ট & স্ক্যানার`)।

### ১.২ Store Listing Experiments (A/B টেস্ট) কী পারে, কী পারে না

| টেস্ট করা যায় | টেস্ট করা যায় **না** |
|---|---|
| Icon | **App name / title** |
| Feature graphic | Category |
| Screenshots | Countries |
| Promo video | Developer name |
| Short description | |
| Full description | |

তাই **title টেস্ট করতে হলে** কাস্টম লিস্টিং ব্যবহার করতে হবে (যেমন en-IN কাস্টম লিস্টিংয়ে `Passport Photo Maker & Scanner` দিয়ে দেখা)। §৬-এ বিস্তারিত।

---

## ২. পাবলিশের আগে যা ঠিক করতে হবে (অ্যাপের ভেতরে)

এগুলো না করলে লিস্টিং যত ভালোই হোক রিভিউ খারাপ হবে, রিভিউ খারাপ হলে র‍্যাঙ্ক হবে না।

- [ ] **ডেস্কটপ ডাউনলোড লিংক**: অ্যাপে এখনো `https://google.com` প্লেসহোল্ডার (`strings.xml` → `connect_desktop_download_url`)। আসল ওয়েবসাইট/ডাউনলোড পেজ দিন।
- [ ] **AdMob App ID**: `strings.xml`-এ এখনো Google-এর টেস্ট ID (`ca-app-pub-3940256099942544~...`)। প্রোডাকশন ID বসান, না হলে রিলিজ বিল্ডে অ্যাড আসবে না / পলিসি সমস্যা হবে।
- [ ] **Windows ইনস্টলার সাইন করা** (SmartScreen ওয়ার্নিং কম হবে) — `desktop_app/DESKTOP_RELEASE_BN.md` দেখুন।
- [ ] **Privacy Policy** পাবলিক URL-এ আছে (অ্যাপের ভেতরের `privacy_policy.html` যথেষ্ট নয়; Console-এ লিংক দিতে হয়)।
- [ ] **In-app review প্রম্পট**: ২য় সফল "Send to PC"-এর পরে দেখান, অ্যাপ খোলার সময় না।
- [ ] **Crash-free ≥ 99.5%** — internal testing ট্র্যাকে ৩–৫টা ফোনে ২–৩ দিন চালিয়ে দেখুন।
- [ ] versionCode বাড়িয়ে **signed AAB** বানান (`./gradlew bundleRelease`)।

---

## ৩. Play Console-এ ধাপে ধাপে (প্রথমবার)

### ধাপ ১ — অ্যাপ তৈরি
1. Play Console → **Create app**।
2. App name: `SendToDesk: Passport & Scanner` (পরে বদলানো যায়)।
3. Default language: **English (United States) – en-US**।
4. App or game: **App**। Free or paid: **Free**।
5. Declarations-এ টিক দিয়ে Create।

### ধাপ ২ — Dashboard-এর "Set up your app" সব শেষ করুন
বাম মেনু → **Policy and programs → App content**। প্রতিটা ফর্ম:

| ফর্ম | আমাদের উত্তর |
|---|---|
| Privacy policy | পাবলিক URL |
| Ads | **Yes, my app contains ads** |
| App access | All functionality available without special access (ডেস্কটপ অ্যাপ লাগে — এটা "special access" নয়, তবে Notes-এ লিখে দিন: "Transfer features require the free SendToDesk Desktop companion on the same Wi‑Fi") |
| Content rating | প্রশ্নপত্র পূরণ → সাধারণত Everyone / 3+ |
| Target audience | 18 and over (বা 13+); **শিশুদের জন্য নয়** — না হলে Families policy লাগবে |
| News app | No |
| COVID-19 | No |
| Data safety | নিচে |
| Government apps | No |
| Financial features | No |
| Health | No |

**Data safety** (গুরুত্বপূর্ণ, ভুল হলে রিজেক্ট):
- Does your app collect or share user data? → **Yes** (AdMob SDK কারণে)।
- Data types: **Device or other IDs** (Advertising ID) → Collected, Shared (with ad partners), purpose: Advertising/Analytics।
- **Photos and videos / Files and docs**: অ্যাপ প্রসেস করে কিন্তু আপনার সার্ভারে পাঠায় না → এগুলো "collected" নয় (on-device processing, local network transfer)। Ephemeral / not collected হিসেবে রাখুন।
- Encryption in transit: লোকাল Wi‑Fi ট্রান্সফার — আপনার প্রোটোকল যদি TLS না হয়, "No" সৎভাবে দিন।
- Data deletion: ইউজার অ্যাপ থেকে ফাইল/ক্যাশ ডিলিট করতে পারে → হ্যাঁ।

### ধাপ ৩ — Main store listing (Default en-US)
বাম মেনু → **Grow → Store presence → Main store listing**।

| ফিল্ড | কোথা থেকে | সীমা |
|---|---|---|
| App name | `PLAY_STORE_LISTING_DEFAULT_EN.md` → `SendToDesk: Passport & Scanner` | 30 |
| Short description | ওই ফাইল → 80/80 লাইন | 80 |
| Full description | ওই ফাইল → পুরো ব্লক (3,332) | 4,000 |
| App icon | 512×512 PNG, ≤1 MB | |
| Feature graphic | 1024×500 | |
| Phone screenshots | কমপক্ষে ২, ভালো হয় ৬–৮; 16:9 বা 9:16; প্রতিটা ≥1080px | |
| 7" ও 10" tablet | ঐচ্ছিক, কিন্তু দিলে ট্যাবলেট সার্চে সুবিধা | |
| Video | YouTube লিংক, ঐচ্ছিক | |

স্ক্রিনশটের **ক্রম** (কনভার্শনের জন্য এটাই সবচেয়ে বড় ফ্যাক্টর):
1. পাসপোর্ট ফটো ক্যামেরা + ব্যাকগ্রাউন্ড রঙ
2. ছবি PC-তে পৌঁছে গেছে (ডেস্কটপ স্ক্রিন)
3. ডকুমেন্ট স্ক্যান → PDF
4. Compress → 100 KB
5. Pair once (Nearby / QR)
6. দোকানের কাউন্টার: ফোন + PC

**Save** করুন (এখনো publish না)।

### ধাপ ৪ — Store settings
**Grow → Store presence → Store settings**:
- App category: **Productivity**
- Tags: Documents, Photo, Productivity, Sharing (Scanner থাকলে সেটাও) — সর্বোচ্চ ৫
- Contact details: email (বাধ্যতামূলক), website, phone (ঐচ্ছিক)
- External marketing: On

### ধাপ ৫ — Custom store listing: India / Hindi
**Grow → Store presence → Custom store listings → Create listing**

1. Listing name (আপনার নিজের জন্য): `India-Hindi`
2. **Targeting** → Country/region: **India** → Language: **Hindi**
   - (Country + Language দুটোই দিন। শুধু Country দিলে ভারতের ইংরেজি ইউজারও হিন্দি দেখবে — চাই না।)
3. ফিল্ডগুলো `PLAY_STORE_ASO_HI.md` থেকে:
   - App name: `SendToDesk: पासपोर्ट & स्कैनर` (29)
   - Short: `Passport Size Photo Maker + PDF Scanner। 100 KB में कंप्रेस करें, PC पर भेजें।` (78)
   - Full: §3 ব্লক (3,213)
   - Screenshots: হিন্দি ক্যাপশন ভার্সন (§4)
4. Save।

### ধাপ ৬ — Custom store listing: India / English (title টেস্টের জন্য)
একই জায়গায় আরেকটা:
1. Listing name: `India-English-TitleTest`
2. Targeting → Country: **India** → Language: **English**
3. App name: `Passport Photo Maker & Scanner` (30, ব্র্যান্ড ছাড়া)
4. Short/Full/Screenshots: Default en-US-এর কপি।
5. Save।

এভাবে ৪ সপ্তাহ পরে **Statistics → Store listing acquisition** (বা Store performance → Search terms)-এ default (অন্য দেশ) বনাম India-English তুলনা করে বোঝা যাবে ব্র্যান্ড ছাড়া title বেশি ইনস্টল আনে কি না। ভালো হলে Default-এও সেটা বসান।

### ধাপ ৭ — Countries / regions (কোন দেশে ছাড়বেন)
**Release → Production → Countries / regions → Add countries / regions**। নিচের §৪-এর লিস্ট ব্যবহার করুন।

### ধাপ ৮ — Testing ট্র্যাক দিয়ে যাওয়া (সরাসরি Production না)
1. **Release → Testing → Internal testing** → Create release → AAB আপলোড → নিজের ৩–৫ জন টেস্টার।
2. ২–৩ দিন চালান: পেয়ারিং, স্ক্যান → সেন্ড, পাসপোর্ট → সেন্ড, শেয়ার শিট, ক্র্যাশ।
3. ঠিক থাকলে **Closed testing** (ঐচ্ছিক) → বা সরাসরি **Production** এ Promote।

> নোট: **২০২৩ নভেম্বরের পরে তৈরি নতুন personal developer account**-এ Production-এ যাওয়ার আগে **Closed testing-এ কমপক্ষে ২০ জন টেস্টার ১৪ দিন** ধরে থাকা বাধ্যতামূলক। আপনার অ্যাকাউন্ট পুরনো/Organization হলে লাগবে না। Console-এর Dashboard-এ "Apply for production access" দেখলে বুঝবেন এটা লাগবে।

### ধাপ ৯ — Production release
1. **Release → Production → Create new release**।
2. AAB আপলোড (Play App Signing চালু রাখুন)।
3. Release name: `1.0 (1)`। Release notes: `PLAY_STORE_LISTING_DEFAULT_EN.md`-এর "What's new" (en-US) + `PLAY_STORE_ASO_HI.md` §5 (hi-IN)।
4. **Review release → Start rollout to Production**।
5. রোলআউট: প্রথম রিলিজ **100%** দিন (নতুন অ্যাপে staged rollout-এর দরকার নেই; আপডেটে 20% → 50% → 100% করবেন)।

রিভিউতে সাধারণত **১–৭ দিন** লাগে। এই সময়ে লিস্টিং বদলাবেন না।

---

## ৪. কোন দেশে ছাড়বেন — ধাপে ধাপে

**চূড়ান্ত সুপারিশ: লঞ্চের দিনই Countries / regions → Add all করুন।** Play র‍্যাঙ্ক **দেশভেদে** আলাদা, রেটিংও ২০২২ থেকে দেশভেদে দেখায় — তাই পেরুতে কম ইনস্টল হলে ভারতের র‍্যাঙ্কে ক্ষতি হয় না। অ্যাপ ফ্রি, পেমেন্ট/জুয়া/ফিন্যান্স নেই, তাই আইনি কারণে কোনো দেশ বাদ দেওয়ার দরকার নেই (স্যাংশন দেশ ও চীন Google নিজেই আটকায়)। বেশি দেশ = Console-এ বেশি সার্চ-টার্ম ডেটা, যা বলে দেবে পরের অনুবাদ কোন ভাষায়।

নিচের Phase-গুলো **কোন দেশে ছাড়বেন** তা নয় — **কোন দেশে মনোযোগ দেবেন** (রিভিউ উত্তর, লিস্টিং টেস্ট, অনুবাদ) তার ক্রম।

একটাই কারণে কোনো দেশ আটকে রাখবেন: সেখানে ডেস্কটপ অ্যাপের ডাউনলোড পেজ/ইনস্টলার চালু না থাকলে। এখন অ্যাপে লিংক `https://google.com` — এটা ঠিক না করে কোথাও পাবলিশ করবেন না।

### Phase 1 — প্রথম ৩০ দিনের মনোযোগ (কোর মার্কেট, ~১২ দেশ)

| দেশ | কারণ | লিস্টিং |
|---|---|---|
| **India** | মূল ইউজার (কাফে/স্টুডিও/অফিস); `passport size photo`, `pdf kb` সার্চ | Default + hi-IN custom + en-IN title test |
| Bangladesh | একই ওয়ার্কফ্লো, বাংলা ইউজার; আপনি নিজে সাপোর্ট দিতে পারবেন | bn-BD translation (`PLAY_STORE_ASO_BN.md`) — পশ্চিমবঙ্গের বাংলা ফোনও এটাই দেখবে |
| Nepal, Sri Lanka, Pakistan | দক্ষিণ এশিয়া, একই ফর্ম-আপলোড কালচার | Default |
| Philippines | `2x2 id photo`, `1x1 and 2x2 photo editor` কীওয়ার্ড এখান থেকে | Default |
| Indonesia | `kompres file pdf 1 mb / 200 kb` কীওয়ার্ড | Default (Phase 2-এ id-ID custom) |
| Malaysia, Singapore | ইংরেজি, ডেস্কটপ ইউজার বেশি | Default |
| UAE, Saudi Arabia | দক্ষিণ এশীয় প্রবাসী, পাসপোর্ট/ভিসা ফটো চাহিদা | Default |
| Nigeria, Kenya | ইংরেজি, সাইবার-কাফে কালচার, কম প্রতিযোগিতা | Default |

### Phase 2 — ৩০ দিন পরে (রেটিং ≥ 4.3 হলে)

| দেশ | কারণ | লিস্টিং |
|---|---|---|
| United States, United Kingdom, Canada, Australia | `us passport photo app`, `uk passport photo app`, `2x2 passport photo` | Default (en-US ইতিমধ্যে আছে) |
| Mexico, Colombia, Argentina, Peru, Chile, Spain | `foto de identificación`, `convertir a pdf 2mb` | **es-419 / es-ES translation** |
| South Korea | `여권 사진 어플`, `신분증 사진` | **ko-KR translation** |
| Japan | `pdf 圧縮` | ja-JP translation (পরে) |
| Brazil | বড় স্ক্যানার মার্কেট | pt-BR translation (পরে) |
| Vietnam, Thailand, Egypt, Turkey | স্ক্যানার/কমপ্রেস চাহিদা | Default |

### Phase 3 — ৬০–৯০ দিন: বাকি সব দেশে মনোযোগ
এই দেশগুলো লঞ্চের দিন থেকেই চালু (Add all)। এখন Console → Search terms দেখে যেখানে ইমপ্রেশন আসছে সেখানে অনুবাদ যোগ করুন। Default en-US লিস্টিং সবাই দেখবে।

**দেশ যোগ করার পদ্ধতি:** Release → Production → Countries / regions → Add countries / regions → টিক দিন → Add → **Save** (উপরে ডানে)। এটা কার্যকর হয় পরবর্তী রিলিজ/রিভিউ ছাড়াই, কয়েক ঘণ্টায়।

---

## ৫. কোন লিস্টিং কোথায় — চূড়ান্ত ম্যাপ

```
                     ┌──────────────────────────────────────────┐
  ভারতের হিন্দি ফোন  ──►  Custom: India + Hindi  (PLAY_STORE_ASO_HI.md)
  ভারতের ইংরেজি ফোন ──►  Custom: India + English (title test, brand ছাড়া)
  বাংলা ফোন (BD + WB) ──►  Translation bn-BD of Main listing (PLAY_STORE_ASO_BN.md)
  স্প্যানিশ ফোন (Ph2) ──►  Translation es-419 of Main listing
  কোরিয়ান ফোন (Ph2)  ──►  Translation ko-KR of Main listing
  বাকি সবাই          ──►  Main / Default en-US (PLAY_STORE_LISTING_DEFAULT_EN.md)
                     └──────────────────────────────────────────┘
```

নিয়ম: **Custom listing** যখন দেশভেদে *বার্তা* আলাদা (ভারতের কাফে-ওয়ার্কফ্লো)। **Translation** যখন শুধু *ভাষা* আলাদা (স্প্যানিশ, কোরিয়ান)।

---

## ৬. A/B টেস্ট (Store Listing Experiments) — কীভাবে চালাবেন

**Grow → Store presence → Store listing experiments → Create experiment**

### সেটআপ
1. **Experiment name**: যেমন `short-desc-docscanner-v1`
2. **Store listing**: Main store listing (বা যে কাস্টম লিস্টিংটা টেস্ট করবেন)
3. **Experiment type**:
   - *Default graphics* → icon/graphics/screenshot টেস্ট, সব ভাষায় একসাথে
   - *Localized* → নির্দিষ্ট ভাষার short/full description টেস্ট → **en-US** বেছে নিন
4. **Target metric**: **Retained first-time installers (1 day)** বেছে নিন (শুধু installers নয়) — যে ভ্যারিয়ান্ট ইনস্টল আনে কিন্তু পরদিন আনইনস্টল হয় তা র‍্যাঙ্কের জন্য খারাপ।
5. **Variants**: ১টা (A বনাম B), অডিয়েন্স **50%**।
6. **Minimum detectable effect**: 1–2% রাখলে দ্রুত রেজাল্ট।

### একবারে একটাই জিনিস বদলান
| ক্রম | টেস্ট | Variant A (বর্তমান) | Variant B |
|---|---|---|---|
| ১ | Short description | `Passport size photo maker + PDF scanner. Compress to 100 KB. One tap send to PC.` | `Passport size photo maker, doc scanner to PDF, compress PDF to KB, send to PC.` |
| ২ | Screenshot 1 | পাসপোর্ট ক্যামেরা | ডকুমেন্ট স্ক্যান |
| ৩ | Icon | পাসপোর্ট-ফটো মার্ক | ডকুমেন্ট/স্ক্যানার মার্ক |
| ৪ | Feature graphic | "Passport photo & PDF scanner → PC" | "Scan. Compress. Send to PC." |
| ৫ | Full description | বর্তমান | প্রথম ৩ লাইনে "No WhatsApp" আগে |

### নিয়ম
- চালান **কমপক্ষে ৭ দিন**, ভালো হয় ১৪ দিন, বা যতদিন না Console "**90% confidence**" দেখায়।
- একই সময়ে একই লিস্টিংয়ে **একটার বেশি experiment না**।
- জিতলে → **Apply** (Console নিজেই লিস্টিং আপডেট করে)। হারলে/অনিশ্চিত হলে → Stop, পরের টেস্ট।
- Experiment চলার সময়ে ম্যানুয়ালি লিস্টিং বদলাবেন না — রেজাল্ট নষ্ট হয়।
- প্রতি টেস্টে কমপক্ষে ~১,০০০ ইনস্টল না হলে ফল বিশ্বাসযোগ্য নয়; শুরুতে ট্র্যাফিক কম থাকলে ২১ দিন পর্যন্ত চালান।

### Title টেস্ট (Experiments-এ হয় না)
§৩ ধাপ ৬-এর **India-English** কাস্টম লিস্টিং দিয়ে করুন। ৪ সপ্তাহ পরে **Statistics** → Store listing acquisition → Compare: Default listing বনাম India-English। ব্র্যান্ডছাড়া title-এ কনভার্শন ≥ ১৫% বেশি হলে Default-এও বদলান।

---

## ৭. পাবলিশের পরে — সপ্তাহ ধরে কী দেখবেন

### দিন ১–৩
- **Dashboard** → status "Published" হয়েছে? না হলে **Policy status**-এ কারণ দেখুন।
- Play Store-এ সার্চ করুন `sendtodesk` — নিজের অ্যাপ আসছে কি না (ইনডেক্স হতে ২৪–৭২ ঘণ্টা)।
- **Android vitals** → crash rate।

### দিন ৪–১৪ (কিছু বদলাবেন না)
- **Statistics → Store performance → Search terms** (বা Acquisition → Store listing acquisition → Search): কোন কীওয়ার্ডে ইমপ্রেশন আসছে। আশা: `passport size photo maker`, `passport photo maker`, `compress pdf`।
- AppTweak-এ Rank ট্র্যাক: `ASO_KEYWORD_STRATEGY.md` §৯-এর ১২টা কীওয়ার্ড।
- Ratings & reviews → প্রতিটা রিভিউর **উত্তর দিন** (৩ দিনের মধ্যে)।

### দিন ১৫+
- প্রথম Experiment চালু (§৬ ক্রম ১)।
- India-English title-test লিস্টিং চালু।
- Phase 2 দেশ + es-419 / ko-KR অনুবাদ (রেটিং ≥ 4.3 হলে)।
- `ASO_KEYWORD_STRATEGY.md` §৮-এর ফিচার (import-and-compress, print sheet) শিপ করলে description-এ সেই লাইনগুলো যোগ করে **নতুন রিলিজের সাথে** লিস্টিং আপডেট।

---

## ৮. সাধারণ ভুল যেগুলো এড়াবেন

- Title/short-এ `free`, `best`, `#1`, ইমোজি, বা অন্য অ্যাপের নাম (ShareMe, CamScanner, AirDrop) — রিজেক্ট।
- Data safety-তে "No data collected" লেখা অথচ AdMob আছে — রিজেক্ট / পরে সাসপেন্ড।
- স্ক্রিনশটে অ্যাপের বাইরের ছবি (স্টক ফটো শুধু) — পলিসি সমস্যা; আসল UI দেখাতে হবে।
- প্রথম ১৪ দিনে বারবার title/description বদলানো — ইনডেক্স রিসেট হয়।
- Custom listing-এ শুধু Country দেওয়া, Language না দেওয়া — ভারতের ইংরেজি ইউজার হিন্দি দেখবে।
- Production-এ সরাসরি প্রথম বিল্ড — Internal testing ছাড়া ক্র্যাশ ধরা পড়ে না।
- ইনস্টল কিনে ভেলোসিটি বানানো — ধরা পড়লে লিস্টিং সাপ্রেস।

---

## ৯. এক পাতার চেকলিস্ট

**অ্যাপ**
- [ ] ডেস্কটপ ডাউনলোড URL আসল
- [ ] AdMob প্রোডাকশন ID
- [ ] Signed AAB, versionCode ঠিক
- [ ] Internal testing ২–৩ দিন, crash-free ≥ 99.5%

**Console – App content**
- [ ] Privacy policy URL
- [ ] Ads = Yes
- [ ] Data safety (Advertising ID collected/shared)
- [ ] Content rating, Target audience

**Console – Listings**
- [ ] Main (en-US) ← `PLAY_STORE_LISTING_DEFAULT_EN.md`
- [ ] Custom India+Hindi ← `PLAY_STORE_ASO_HI.md`
- [ ] Custom India+English (title test)
- [ ] Translation bn-BD ← `PLAY_STORE_ASO_BN.md` (Main listing → Manage translations)
- [ ] Store settings: Productivity, tags, contact

**Console – Release**
- [ ] Countries: **Add all** (মনোযোগ Phase 1-এর ~১২ দেশে)
- [ ] Production release, 100% rollout
- [ ] Release notes en-US + hi-IN

**পরে**
- [ ] দিন ১৫: Experiment ১
- [ ] দিন ৩০: Phase 2 দেশ + অনুবাদ
- [ ] প্রতি সপ্তাহ: Search terms + AppTweak rank + রিভিউ উত্তর
