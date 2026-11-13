# JSON CMS — SendToDesk এর সাথে ব্যবহার

মার্কেটিং সাইট স্ট্যাটিক থাকবে। কনটেন্ট/সেটিংস আসবে JSON CMS থেকে।

1. `json-cms/` আলাদা Cloudflare Pages প্রজেক্ট হিসেবে ডিপ্লয় করুন (গাইড: [json-cms/README.md](../json-cms/README.md))
2. Seed samples চালান
3. সাইটের JS-এ CMS URL দিন, উদাহরণ:

```js
const CMS = "https://YOUR-CMS.pages.dev";

async function loadSettings() {
  const res = await fetch(`${CMS}/content/site-settings.json`);
  if (!res.ok) return null;
  return res.json();
}
```

ব্লগ পেজ চাইলে একইভাবে `/content/blog.json` ফেচ করে রেন্ডার করুন।
