/**
 * Locked content templates — clients edit values, not structure.
 */
(function (global) {
  const TEMPLATES = [
    {
      id: "blog",
      label: "Blog",
      description: "Blog posts with HTML body",
      defaultFile: "blog.json",
      match: /^blog\.json$/i,
      fields: [
        {
          key: "posts",
          type: "array",
          label: "Posts",
          itemLabel: "Post",
          itemFields: [
            { key: "id", type: "text", label: "ID" },
            { key: "title", type: "text", label: "Title" },
            { key: "slug", type: "text", label: "Slug" },
            { key: "date", type: "date", label: "Date" },
            { key: "published", type: "boolean", label: "Published" },
            { key: "excerpt", type: "textarea", label: "Excerpt" },
            { key: "imageUrl", type: "url", label: "Image URL" },
            { key: "body", type: "html", label: "Body" },
          ],
          itemDefault: {
            id: "new-post",
            title: "New post",
            slug: "new-post",
            date: new Date().toISOString().slice(0, 10),
            published: false,
            excerpt: "",
            imageUrl: "",
            body: "<p>Start writing…</p>",
          },
        },
      ],
    },
    {
      id: "faq",
      label: "FAQ",
      description: "Questions and HTML answers",
      defaultFile: "faq.json",
      match: /^faq\.json$/i,
      fields: [
        { key: "title", type: "text", label: "Page title" },
        {
          key: "items",
          type: "array",
          label: "Questions",
          itemLabel: "Question",
          itemFields: [
            { key: "title", type: "text", label: "Question" },
            { key: "body", type: "html", label: "Answer" },
          ],
          itemDefault: {
            title: "New question",
            body: "<p>Answer here…</p>",
          },
        },
      ],
    },
    {
      id: "pages",
      label: "Pages",
      description: "Static pages with HTML content",
      defaultFile: "pages.json",
      match: /^pages?\.json$/i,
      fields: [
        {
          key: "pages",
          type: "array",
          label: "Pages",
          itemLabel: "Page",
          itemFields: [
            { key: "title", type: "text", label: "Title" },
            { key: "slug", type: "text", label: "Slug" },
            { key: "published", type: "boolean", label: "Published" },
            { key: "body", type: "html", label: "Body" },
          ],
          itemDefault: {
            title: "New page",
            slug: "new-page",
            published: false,
            body: "<p>Page content…</p>",
          },
        },
      ],
    },
    {
      id: "site-settings",
      label: "Site settings",
      description: "Site name, hero, download links",
      defaultFile: "site-settings.json",
      match: /^site[-_]?settings\.json$/i,
      fields: [
        { key: "siteName", type: "text", label: "Site name" },
        { key: "tagline", type: "text", label: "Tagline" },
        { key: "supportEmail", type: "email", label: "Support email" },
        { key: "themeColor", type: "color", label: "Theme color" },
        { key: "published", type: "boolean", label: "Published" },
        {
          key: "hero",
          type: "object",
          label: "Hero",
          fields: [
            { key: "title", type: "text", label: "Title" },
            { key: "subtitle", type: "textarea", label: "Subtitle" },
            { key: "ctaLabel", type: "text", label: "Button label" },
            { key: "imageUrl", type: "url", label: "Image URL" },
          ],
        },
        {
          key: "download",
          type: "object",
          label: "Download",
          fields: [
            { key: "version", type: "text", label: "Version" },
            { key: "windowsUrl", type: "url", label: "Windows download URL" },
            { key: "playStoreUrl", type: "url", label: "Play Store URL" },
          ],
        },
      ],
    },
    {
      id: "ads",
      label: "Ads",
      description: "Ad slots and unit IDs",
      defaultFile: "ads.json",
      match: /^ads\.json$/i,
      fields: [
        { key: "enabled", type: "boolean", label: "Ads enabled" },
        { key: "notes", type: "textarea", label: "Notes" },
        {
          key: "slots",
          type: "array",
          label: "Ad slots",
          itemLabel: "Slot",
          itemFields: [
            { key: "id", type: "text", label: "Slot ID" },
            { key: "title", type: "text", label: "Title" },
            { key: "type", type: "text", label: "Type" },
            { key: "unitId", type: "text", label: "Unit ID" },
            { key: "active", type: "boolean", label: "Active" },
          ],
          itemDefault: {
            id: "new-slot",
            title: "New slot",
            type: "banner",
            unitId: "",
            active: false,
          },
        },
      ],
    },
    {
      id: "team",
      label: "Team",
      description: "Team members list",
      defaultFile: "team.json",
      match: /^team\.json$/i,
      fields: [
        { key: "title", type: "text", label: "Section title" },
        {
          key: "people",
          type: "array",
          label: "People",
          itemLabel: "Person",
          itemFields: [
            { key: "name", type: "text", label: "Name" },
            { key: "title", type: "text", label: "Role" },
            { key: "email", type: "email", label: "Email" },
            { key: "avatar", type: "url", label: "Avatar URL" },
            { key: "bio", type: "textarea", label: "Bio" },
            { key: "active", type: "boolean", label: "Active" },
          ],
          itemDefault: {
            name: "New member",
            title: "Role",
            email: "",
            avatar: "",
            bio: "",
            active: true,
          },
        },
      ],
    },
    {
      id: "custom",
      label: "Custom (freeform)",
      description: "Advanced — structure can be changed",
      defaultFile: "custom.json",
      match: null,
      locked: false,
      fields: null,
    },
  ];

  function emptyForType(type) {
    switch (type) {
      case "number":
        return 0;
      case "boolean":
        return false;
      case "html":
        return "<p></p>";
      case "array":
        return [];
      case "object":
        return {};
      default:
        return "";
    }
  }

  function list() {
    return TEMPLATES.filter((t) => t.id !== "custom").concat(
      TEMPLATES.filter((t) => t.id === "custom")
    );
  }

  function get(id) {
    return TEMPLATES.find((t) => t.id === id) || null;
  }

  function matchFile(fileName) {
    const name = String(fileName || "").split("/").pop();
    for (const t of TEMPLATES) {
      if (t.match && t.match.test(name)) return t;
    }
    return null;
  }

  function resolve(fileName, data) {
    if (data && data._template) {
      const byMeta = get(data._template);
      if (byMeta) return byMeta;
    }
    return matchFile(fileName);
  }

  function buildFromFields(fields) {
    if (!fields) return {};
    const out = {};
    fields.forEach((f) => {
      if (f.type === "array") {
        out[f.key] = f.itemDefault ? [JSON.parse(JSON.stringify(f.itemDefault))] : [];
      } else if (f.type === "object") {
        out[f.key] = buildFromFields(f.fields || []);
      } else if (f.default !== undefined) {
        out[f.key] = JSON.parse(JSON.stringify(f.default));
      } else {
        out[f.key] = emptyForType(f.type);
      }
    });
    return out;
  }

  function createData(templateId) {
    const t = get(templateId) || get("custom");
    if (!t || !t.fields) {
      return {
        _template: "custom",
        title: "Custom content",
        published: false,
        body: "<p>Start writing…</p>",
      };
    }
    const data = buildFromFields(t.fields);
    data._template = t.id;
    return data;
  }

  function applyDefaults(data, template) {
    if (!template || !template.fields) return data;
    const base = createData(template.id);
    return deepMergePreserve(base, data && typeof data === "object" ? data : {});
  }

  function deepMergePreserve(defaults, current) {
    if (Array.isArray(defaults)) {
      if (Array.isArray(current)) return current;
      return JSON.parse(JSON.stringify(defaults));
    }
    if (defaults && typeof defaults === "object") {
      const out = {};
      const keys = new Set([...Object.keys(defaults), ...Object.keys(current || {})]);
      keys.forEach((k) => {
        if (k in defaults && current && k in current) {
          const d = defaults[k];
          const c = current[k];
          if (d && typeof d === "object" && !Array.isArray(d) && c && typeof c === "object" && !Array.isArray(c)) {
            out[k] = deepMergePreserve(d, c);
          } else {
            out[k] = c;
          }
        } else if (current && k in current && !(k in defaults)) {
          // drop unknown keys for locked templates (except _template)
          if (k === "_template") out[k] = current[k];
        } else {
          out[k] = JSON.parse(JSON.stringify(defaults[k]));
        }
      });
      if (current && current._template) out._template = current._template;
      else if (defaults._template) out._template = defaults._template;
      return out;
    }
    return current !== undefined ? current : defaults;
  }

  /** Strip internal meta before public-facing use if needed */
  function stripMeta(data) {
    if (!data || typeof data !== "object") return data;
    const out = JSON.parse(JSON.stringify(data));
    delete out._template;
    return out;
  }

  global.ContentTemplates = {
    list,
    get,
    matchFile,
    resolve,
    createData,
    applyDefaults,
    stripMeta,
  };
})(window);
