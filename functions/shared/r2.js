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
