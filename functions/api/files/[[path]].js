import { requireUser, json } from "../../_shared/auth.js";
import { normalizeKey, displayName, readJson, writeJson } from "../../_shared/r2.js";

function pathFromParams(params) {
  const p = params.path;
  if (Array.isArray(p)) return p.join("/");
  return p || "";
}

export async function onRequestGet({ request, env, params }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  let key;
  try {
    key = normalizeKey(pathFromParams(params));
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  try {
    const data = await readJson(env.CONTENT, key);
    if (data === null) return json({ error: "Not found" }, 404);
    return json({ key, name: displayName(key), data });
  } catch (e) {
    return json({ error: e.message || "Read failed" }, 500);
  }
}

export async function onRequestPut({ request, env, params }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  let key;
  try {
    key = normalizeKey(pathFromParams(params));
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!("data" in body)) return json({ error: "Missing data field" }, 400);

  try {
    JSON.stringify(body.data);
  } catch {
    return json({ error: "data must be JSON-serializable" }, 400);
  }

  try {
    const size = await writeJson(env.CONTENT, key, body.data);
    return json({ ok: true, key, name: displayName(key), size });
  } catch (e) {
    return json({ error: e.message || "Save failed" }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  let key;
  try {
    key = normalizeKey(pathFromParams(params));
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  try {
    await env.CONTENT.delete(key);
    return json({ ok: true, key });
  } catch (e) {
    return json({ error: e.message || "Delete failed" }, 500);
  }
}
