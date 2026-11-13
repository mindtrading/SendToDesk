const INSTALL_KEY = "meta/install.json";

export async function readInstall(bucket) {
  const obj = await bucket.get(INSTALL_KEY);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

export async function writeInstall(bucket, data) {
  const body = JSON.stringify(data, null, 2);
  await bucket.put(INSTALL_KEY, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return data;
}

export async function clearInstall(bucket) {
  await bucket.delete(INSTALL_KEY);
}

/** Wipe install marker + all public content JSON (for re-testing setup). */
export async function resetInstallation(bucket) {
  const deleted = [];
  await bucket.delete(INSTALL_KEY);
  deleted.push(INSTALL_KEY);

  let cursor;
  do {
    const listed = await bucket.list({ prefix: "content/", cursor, limit: 1000 });
    for (const obj of listed.objects || []) {
      if (!obj.key.toLowerCase().endsWith(".json")) continue;
      await bucket.delete(obj.key);
      deleted.push(obj.key);
    }
    cursor = listed.truncated && listed.cursor ? listed.cursor : undefined;
  } while (cursor);

  // drafts for a clean slate
  cursor = undefined;
  do {
    const listed = await bucket.list({ prefix: "drafts/", cursor, limit: 1000 });
    for (const obj of listed.objects || []) {
      await bucket.delete(obj.key);
      deleted.push(obj.key);
    }
    cursor = listed.truncated && listed.cursor ? listed.cursor : undefined;
  } while (cursor);

  return deleted;
}

export function buildSiteSettings(input = {}) {
  const siteName = String(input.siteName || "My Site").trim() || "My Site";
  const tagline = String(input.tagline || "Edit this in Content Studio").trim();
  const supportEmail = String(input.supportEmail || "support@example.com").trim();
  const themeColor = String(input.themeColor || "#1d4ed8").trim() || "#1d4ed8";
  const heroTitle = String(input.heroTitle || `Welcome to ${siteName}`).trim();
  const heroSubtitle = String(
    input.heroSubtitle || tagline || "Your content is live from Content Studio."
  ).trim();
  const ctaLabel = String(input.ctaLabel || "Get started").trim();
  const heroImage = String(input.heroImage || "").trim();
  const version = String(input.version || "1.0.0").trim() || "1.0.0";
  const windowsUrl = String(input.windowsUrl || "").trim();
  const playStoreUrl = String(input.playStoreUrl || "").trim();

  return {
    siteName,
    tagline,
    supportEmail,
    themeColor,
    published: true,
    hero: {
      title: heroTitle,
      subtitle: heroSubtitle,
      ctaLabel,
      imageUrl: heroImage,
    },
    download: {
      version,
      windowsUrl,
      playStoreUrl,
    },
  };
}

export function packCatalog() {
  return [
    {
      id: "blog",
      file: "blog.json",
      label: "Blog",
      description: "Posts with HTML body for news and guides",
    },
    {
      id: "faq",
      file: "faq.json",
      label: "FAQ",
      description: "Questions and answers page",
    },
    {
      id: "pages",
      file: "pages.json",
      label: "Pages",
      description: "Static pages like About",
    },
    {
      id: "ads",
      file: "ads.json",
      label: "Ads",
      description: "Ad slots and unit IDs",
    },
    {
      id: "team",
      file: "team.json",
      label: "Team",
      description: "People cards for about/team",
    },
  ];
}

export function buildPackData(packId, site) {
  const name = site.siteName || "My Site";
  const email = site.supportEmail || "support@example.com";

  if (packId === "blog") {
    return {
      posts: [
        {
          id: "welcome",
          title: `Welcome to ${name}`,
          slug: "welcome",
          date: new Date().toISOString().slice(0, 10),
          published: true,
          excerpt: `Get started with ${name}. Edit this post in Content Studio.`,
          imageUrl: "",
          body: `<h2>You're live</h2><p>This post was created by the setup wizard. Open <strong>blog.json</strong> in Content Studio to edit it.</p><p>Need help? Email <em>${email}</em>.</p>`,
        },
      ],
    };
  }

  if (packId === "faq") {
    return {
      title: "FAQ",
      items: [
        {
          title: "How do I edit content?",
          body: "<p>Sign in to Content Studio, open a file on the left, edit fields, then Save.</p>",
        },
        {
          title: "Where is the live JSON?",
          body: `<p>Public URL: <code>/content/faq.json</code>. Your site can fetch it anytime.</p>`,
        },
      ],
    };
  }

  if (packId === "pages") {
    return {
      pages: [
        {
          title: "About",
          slug: "about",
          published: true,
          body: `<p>${name} — ${site.tagline || "powered by Content Studio"}.</p>`,
        },
      ],
    };
  }

  if (packId === "ads") {
    return {
      enabled: false,
      notes: "Turn on when ready. Unit IDs are placeholders.",
      slots: [
        {
          id: "home-banner",
          title: "Home banner",
          type: "banner",
          unitId: "ca-app-pub-xxxxx",
          active: false,
        },
      ],
    };
  }

  if (packId === "team") {
    return {
      title: "Team",
      members: [
        {
          name: "Founder",
          role: "Owner",
          bio: "Update this in Content Studio.",
          photoUrl: "",
          email,
        },
      ],
    };
  }

  return null;
}
