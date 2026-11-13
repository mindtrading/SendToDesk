import {
  createSessionToken,
  sessionCookie,
  clearSessionCookie,
  timingSafeEqual,
  requireUser,
  json,
} from "../shared/auth.js";
import {
  listJsonFiles,
  normalizeKey,
  displayName,
  readJson,
  writeJson,
} from "../shared/r2.js";

function segmentsFromParams(params) {
  const p = params.path;
  if (Array.isArray(p)) return p.filter(Boolean);
  if (!p) return [];
  return String(p).split("/").filter(Boolean);
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const expectedUser = env.ADMIN_USER || "admin";
  const expectedPass = env.ADMIN_PASSWORD;

  if (!expectedPass) {
    return json({ error: "ADMIN_PASSWORD is not configured" }, 500);
  }

  const userOk = timingSafeEqual(username, expectedUser);
  const passOk = timingSafeEqual(password, expectedPass);
  if (!userOk || !passOk) {
    return json({ error: "Wrong username or password" }, 401);
  }

  try {
    const token = await createSessionToken(env, expectedUser);
    return json(
      { ok: true, user: expectedUser },
      200,
      { "Set-Cookie": sessionCookie(token) }
    );
  } catch (e) {
    return json({ error: e.message || "Session error" }, 500);
  }
}

async function handleFiles(request, env, fileParts) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  const method = request.method;
  const fileName = fileParts.join("/");

  // GET /api/files
  if (!fileName && method === "GET") {
    try {
      const files = await listJsonFiles(env.CONTENT);
      return json({ files });
    } catch (e) {
      return json({ error: e.message || "List failed" }, 500);
    }
  }

  // POST /api/files  { name, data }
  if (!fileName && method === "POST") {
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
      return json(
        { ok: true, key, name: displayName(key), size },
        201
      );
    } catch (e) {
      return json({ error: e.message || "Create failed" }, 500);
    }
  }

  if (!fileName) {
    return json({ error: "Method not allowed" }, 405);
  }

  let key;
  try {
    key = normalizeKey(fileName);
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  if (method === "GET") {
    try {
      const data = await readJson(env.CONTENT, key);
      if (data === null) return json({ error: "Not found" }, 404);
      return json({ key, name: displayName(key), data });
    } catch (e) {
      return json({ error: e.message || "Read failed" }, 500);
    }
  }

  if (method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!("data" in body)) return json({ error: "Missing data field" }, 400);
    try {
      const size = await writeJson(env.CONTENT, key, body.data);
      return json({ ok: true, key, name: displayName(key), size });
    } catch (e) {
      return json({ error: e.message || "Save failed" }, 500);
    }
  }

  if (method === "DELETE") {
    try {
      await env.CONTENT.delete(key);
      return json({ ok: true, key });
    } catch (e) {
      return json({ error: e.message || "Delete failed" }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const segs = segmentsFromParams(params);
  const method = request.method;
  const head = segs[0] || "";

  if (head === "login" && method === "POST") {
    return handleLogin(request, env);
  }

  if (head === "logout" && method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }

  if (head === "me" && method === "GET") {
    const user = await requireUser(request, env);
    if (!user) return json({ authenticated: false }, 401);
    return json({ authenticated: true, user });
  }

  if (head === "files") {
    return handleFiles(request, env, segs.slice(1));
  }

  return json({ error: "Not found", path: segs.join("/") }, 404);
}
