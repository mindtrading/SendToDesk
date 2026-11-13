# JSON CMS — SendToDesk

লাইভ অ্যাডমিন: [https://sendtodesk.pages.dev/json-cms/](https://sendtodesk.pages.dev/json-cms/)

বিস্তারিত সেটআপ: [json-cms/README.md](../json-cms/README.md)

পাবলিক JSON উদাহরণ:

```js
const CMS = "https://sendtodesk.pages.dev";
const settings = await (await fetch(`${CMS}/content/site-settings.json`)).json();
```

Cloudflare-এ একবার লাগবে: R2 binding `CONTENT` + `ADMIN_USER` / `ADMIN_PASSWORD` / `SESSION_SECRET`।
