# SendToDesk website

Static site for:

- Desktop **Windows** download
- Google Play **Website**, **Privacy policy**, and **Support** URLs
- Microsoft Store privacy URL (same privacy page)

Still HTML, CSS, and a tiny `assets/js/site.js`. No React, no build, no server. Upload the `website` folder to Netlify, Cloudflare Pages, GitHub Pages, or any static host.

## Pages (use these in store consoles)

After the site is live at `https://YOURDOMAIN`:

| Play Console / Store field | URL |
|---|---|
| Website / marketing site | `https://YOURDOMAIN/` |
| Privacy policy | `https://YOURDOMAIN/privacy/` |
| Terms (optional) | `https://YOURDOMAIN/terms/` |
| Support / contact | `https://YOURDOMAIN/support/` |
| Install guide | `https://YOURDOMAIN/install/` |
| Desktop download (in-app) | `https://YOURDOMAIN/#download` |

### Google Play Console

1. **Policy and programs → App content → Privacy policy** → privacy URL.
2. **Grow → Store presence → Store settings → Contact details → Website** → home URL.
3. Support email: the inbox in `assets/js/site.js` (`email`).

Then in the Android app, replace the placeholder:

`app/src/main/res/values/strings.xml` → `connect_desktop_download_url`

```
https://YOURDOMAIN/#download
```

## Put desktop builds in `downloads/`

```
website/downloads/SendToDesk-1.0.0-windows.zip
```

Windows: zip the **whole** `Release` folder, then add these files from `website/downloads/` into the zip:

- `READ-ME-FIRST.txt`
- `install-guide.html`
- `install-guide-images/` (whole folder)

Name and version are set at the top of `assets/js/site.js`.

## Host (pick one)

**Cloudflare Pages / Netlify / GitHub Pages**

- Publish directory: `website` (this folder as site root)
- HTTPS is required for Play privacy links
- Buy a simple domain (example: `sendtodesk.app`) and point it at the host
- Replace `YOURDOMAIN` in `sitemap.xml`

Local preview:

```bash
cd website
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`

## Before going live

1. Set `email`, `version`, and zip filenames in `assets/js/site.js`
2. Edit the visible mail on Support if you do not use JS (it is filled from `email`)
3. Add the Windows zip file
4. Confirm `/privacy/` loads with no login wall (Play requirement)
