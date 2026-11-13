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
