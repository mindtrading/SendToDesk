import { requireUser, json } from "../shared/auth.js";
import { listJsonFiles, normalizeKey, writeJson } from "../shared/r2.js";

export async function onRequestGet({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  try {
    const files = await listJsonFiles(env.CONTENT);
    return json({ files });
  } catch (e) {
    return json({ error: e.message || "List failed" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const rawName = body.name || body.key;
  if (!rawName || !String(rawName).trim()) {
    return json({ error: "Missing file name" }, 400);
  }

  let key;
  try {
    key = normalizeKey(rawName);
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  const existing = await env.CONTENT.head(key);
  if (existing) return json({ error: "File already exists" }, 409);

  const data = body.data !== undefined ? body.data : {};
  try {
    const size = await writeJson(env.CONTENT, key, data);
    return json({ ok: true, key, name: key.replace(/^content\//, ""), size }, 201);
  } catch (e) {
    return json({ error: e.message || "Create failed" }, 500);
  }
}
