const PREFIX = "content/";

export function normalizeKey(raw) {
  let key = String(raw || "").replace(/^\/+/, "");
  key = key.replace(/\.\./g, "");
  if (!key.toLowerCase().endsWith(".json")) {
    throw new Error("Only .json files are allowed");
  }
  if (key.includes("\\") || key.includes("\0")) {
    throw new Error("Invalid key");
  }
  if (!key.startsWith(PREFIX)) key = PREFIX + key;
  return key;
}

export function displayName(key) {
  return key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key;
}

export async function listJsonFiles(bucket) {
  const files = [];
  let cursor;
  do {
    const listed = await bucket.list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const obj of listed.objects || []) {
      if (obj.key.toLowerCase().endsWith(".json")) {
        files.push({
          key: obj.key,
          name: displayName(obj.key),
          size: obj.size,
          uploaded: obj.uploaded ? new Date(obj.uploaded).toISOString() : null,
        });
      }
    }
    cursor = listed.truncated && listed.cursor ? listed.cursor : undefined;
  } while (cursor);
  files.sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

export async function readJson(bucket, key) {
  const obj = await bucket.get(key);
  if (!obj) return null;
  const text = await obj.text();
  return JSON.parse(text);
}

export async function writeJson(bucket, key, data) {
  const body = JSON.stringify(data, null, 2);
  await bucket.put(key, body, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  return body.length;
}

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function extForImage(type, fileName) {
  if (IMAGE_TYPES[type]) return IMAGE_TYPES[type];
  const m = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  if (m && ["jpg", "jpeg", "png", "gif", "webp"].includes(m[1])) {
    return m[1] === "jpeg" ? "jpg" : m[1];
  }
  return null;
}

export function isAllowedImage(type, fileName) {
  return !!extForImage(type, fileName);
}

export function mediaObjectKey(fileName, contentType) {
  const ext = extForImage(contentType, fileName) || "bin";
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const safeBase = String(fileName || "image")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";
  return `media/${y}/${m}/${id}-${safeBase}.${ext}`;
}

export async function writeMedia(bucket, key, data, contentType) {
  await bucket.put(key, data, {
    httpMetadata: { contentType: contentType || "application/octet-stream" },
  });
  return key;
}

const MAX_VERSIONS = 30;

export function draftKey(fileName) {
  const name = displayName(normalizeKey(fileName));
  return `drafts/${name}`;
}

export function versionsPrefix(fileName) {
  const name = displayName(normalizeKey(fileName));
  return `versions/${name}/`;
}

export function versionObjectKey(fileName, id) {
  return versionsPrefix(fileName) + id + ".json";
}

export async function saveVersionSnapshot(bucket, fileName, data, meta = {}) {
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const key = versionObjectKey(fileName, id);
  const payload = {
    id,
    savedAt: new Date().toISOString(),
    file: displayName(normalizeKey(fileName)),
    user: meta.user || null,
    data,
  };
  await writeJson(bucket, key, payload);

  // prune oldest beyond MAX_VERSIONS
  const listed = await bucket.list({ prefix: versionsPrefix(fileName), limit: 1000 });
  const objs = (listed.objects || [])
    .filter((o) => o.key.endsWith(".json"))
    .sort((a, b) => (a.uploaded > b.uploaded ? 1 : -1));
  if (objs.length > MAX_VERSIONS) {
    const toDelete = objs.slice(0, objs.length - MAX_VERSIONS);
    await Promise.all(toDelete.map((o) => bucket.delete(o.key)));
  }
  return { id, savedAt: payload.savedAt };
}

export async function listVersions(bucket, fileName) {
  const listed = await bucket.list({ prefix: versionsPrefix(fileName), limit: 1000 });
  const items = [];
  for (const obj of listed.objects || []) {
    if (!obj.key.endsWith(".json")) continue;
    const id = obj.key.split("/").pop().replace(/\.json$/i, "");
    items.push({
      id,
      savedAt: obj.uploaded ? new Date(obj.uploaded).toISOString() : null,
      size: obj.size,
    });
  }
  items.sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
  return items;
}

export async function readVersion(bucket, fileName, id) {
  const safeId = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return null;
  return readJson(bucket, versionObjectKey(fileName, safeId));
}

export async function readDraft(bucket, fileName) {
  return readJson(bucket, draftKey(fileName));
}

export async function writeDraft(bucket, fileName, data, meta = {}) {
  const payload = {
    file: displayName(normalizeKey(fileName)),
    updatedAt: new Date().toISOString(),
    user: meta.user || null,
    data,
  };
  await writeJson(bucket, draftKey(fileName), payload);
  return payload;
}

export async function deleteDraft(bucket, fileName) {
  await bucket.delete(draftKey(fileName));
}
