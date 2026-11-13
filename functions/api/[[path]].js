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
  isAllowedImage,
  mediaObjectKey,
  writeMedia,
  listMedia,
  deleteMedia,
  saveVersionSnapshot,
  listVersions,
  readVersion,
  readDraft,
  writeDraft,
  deleteDraft,
} from "../shared/r2.js";
import {
  readInstall,
  writeInstall,
  buildSiteSettings,
  packCatalog,
  buildPackData,
  resetInstallation,
} from "../shared/setup.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
      const prev = await readJson(env.CONTENT, key);
      let version = null;
      if (prev !== null) {
        version = await saveVersionSnapshot(env.CONTENT, fileName, prev, { user });
      }
      const size = await writeJson(env.CONTENT, key, body.data);
      try {
        await deleteDraft(env.CONTENT, fileName);
      } catch (_) {}
      return json({ ok: true, key, name: displayName(key), size, version });
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

async function handleUpload(request, env) {
  const user = await requireUser(request, env);
  if (!user) return json({ errorMessage: "Unauthorized", result: [] }, 401);
  if (!env.CONTENT) return json({ errorMessage: "R2 binding missing", result: [] }, 500);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ errorMessage: "Invalid form data", result: [] }, 400);
  }

  const files = [];
  for (const [key, value] of form.entries()) {
    if (value && typeof value === "object" && typeof value.arrayBuffer === "function") {
      files.push({ field: key, file: value });
    }
  }

  if (!files.length) {
    return json({ errorMessage: "No file uploaded", result: [] }, 400);
  }

  const origin = new URL(request.url).origin;
  const result = [];

  for (const { file } of files) {
    const type = file.type || "application/octet-stream";
    const name = file.name || "image";
    if (!isAllowedImage(type, name)) {
      return json(
        { errorMessage: "Only JPG, PNG, GIF, or WebP images are allowed", result: [] },
        400
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return json(
        { errorMessage: "Image must be 5MB or smaller", result: [] },
        400
      );
    }

    const key = mediaObjectKey(name, type);
    const buf = await file.arrayBuffer();
    await writeMedia(env.CONTENT, key, buf, type);
    const publicPath = "/" + key; // /media/YYYY/MM/...
    result.push({
      url: origin + publicPath,
      name: name,
      size: buf.byteLength,
    });
  }

  // SunEditor expected shape
  return json({ result });
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

  if (head === "upload" && method === "POST") {
    return handleUpload(request, env);
  }

  if (head === "media") {
    return handleMediaLibrary(request, env, segs.slice(1), method);
  }

  if (head === "files") {
    return handleFiles(request, env, segs.slice(1));
  }

  if (head === "versions") {
    return handleVersions(request, env, segs.slice(1), method);
  }

  if (head === "drafts") {
    return handleDrafts(request, env, segs.slice(1), method);
  }

  if (head === "setup") {
    return handleSetup(request, env, segs.slice(1), method);
  }

  return json({ error: "Not found", path: segs.join("/") }, 404);
}

async function handleMediaLibrary(request, env, parts, method) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const bindingOk = Boolean(env.CONTENT);
  if (!bindingOk) {
    return json({ bindingOk: false, items: [], error: "R2 binding CONTENT missing" }, 500);
  }

  // GET /api/media
  if (!parts.length && method === "GET") {
    try {
      const items = await listMedia(env.CONTENT);
      return json({ bindingOk: true, count: items.length, items });
    } catch (e) {
      return json({ error: e.message || "List media failed", bindingOk: true }, 500);
    }
  }

  // DELETE /api/media/:key...
  if (parts.length && method === "DELETE") {
    try {
      const key = parts.join("/");
      const deleted = await deleteMedia(env.CONTENT, key);
      return json({ ok: true, key: deleted });
    } catch (e) {
      return json({ error: e.message || "Delete failed" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

async function handleSetup(request, env, parts, method) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const bindingOk = Boolean(env.CONTENT);
  if (!bindingOk) {
    return json({
      needsSetup: true,
      installed: false,
      bindingOk: false,
      fileCount: 0,
      packs: packCatalog(),
      error: "R2 binding CONTENT missing",
    });
  }

  // GET /api/setup
  if ((!parts.length || parts[0] === "status") && method === "GET") {
    try {
      const install = await readInstall(env.CONTENT);
      const files = await listJsonFiles(env.CONTENT);
      const fileCount = files.length;
      const installed = Boolean(install);
      const needsSetup = !installed && fileCount === 0;
      return json({
        needsSetup,
        installed,
        bindingOk: true,
        fileCount,
        install,
        packs: packCatalog(),
        publicBase: "/content/",
      });
    } catch (e) {
      return json({ error: e.message || "Setup status failed" }, 500);
    }
  }

  // POST /api/setup  — run wizard install
  if ((!parts.length || parts[0] === "install") && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    try {
      const existingInstall = await readInstall(env.CONTENT);
      if (existingInstall && !body.force) {
        return json({ error: "Already installed", install: existingInstall }, 409);
      }

      const site = buildSiteSettings(body);
      const created = [];

      const settingsKey = normalizeKey("site-settings.json");
      await writeJson(env.CONTENT, settingsKey, site);
      created.push("site-settings.json");

      const wanted = Array.isArray(body.packs) ? body.packs : ["blog", "faq", "pages"];
      const catalog = packCatalog();
      for (const pack of catalog) {
        if (!wanted.includes(pack.id)) continue;
        const data = buildPackData(pack.id, site);
        if (!data) continue;
        const key = normalizeKey(pack.file);
        const headObj = await env.CONTENT.head(key);
        if (headObj && !body.overwrite) {
          // keep existing file, still count as present
          created.push(pack.file + " (kept)");
          continue;
        }
        await writeJson(env.CONTENT, key, data);
        created.push(pack.file);
      }

      const install = await writeInstall(env.CONTENT, {
        completedAt: new Date().toISOString(),
        completedBy: user,
        siteName: site.siteName,
        packs: wanted,
        files: created,
      });

      return json({
        ok: true,
        install,
        created,
        site,
        publicUrl: "/content/site-settings.json",
      });
    } catch (e) {
      return json({ error: e.message || "Install failed" }, 500);
    }
  }

  // POST /api/setup/skip — mark installed without seeding
  if (parts[0] === "skip" && method === "POST") {
    try {
      const install = await writeInstall(env.CONTENT, {
        completedAt: new Date().toISOString(),
        completedBy: user,
        skipped: true,
        siteName: null,
        packs: [],
        files: [],
      });
      return json({ ok: true, install });
    } catch (e) {
      return json({ error: e.message || "Skip failed" }, 500);
    }
  }

  // POST /api/setup/reset — wipe content + install marker (re-test wizard)
  if (parts[0] === "reset" && method === "POST") {
    try {
      const deleted = await resetInstallation(env.CONTENT);
      return json({
        ok: true,
        deleted,
        needsSetup: true,
        message: "Installation reset. Log in again to run the setup wizard.",
      });
    } catch (e) {
      return json({ error: e.message || "Reset failed" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

async function handleVersions(request, env, parts, method) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  const fileName = parts[0];
  if (!fileName) return json({ error: "Missing file name" }, 400);

  // GET /api/versions/:file
  if (parts.length === 1 && method === "GET") {
    try {
      const versions = await listVersions(env.CONTENT, fileName);
      return json({ file: displayName(normalizeKey(fileName)), versions });
    } catch (e) {
      return json({ error: e.message || "List versions failed" }, 500);
    }
  }

  // GET /api/versions/:file/:id
  if (parts.length === 2 && method === "GET") {
    try {
      const version = await readVersion(env.CONTENT, fileName, parts[1]);
      if (!version) return json({ error: "Version not found" }, 404);
      return json({ file: displayName(normalizeKey(fileName)), version });
    } catch (e) {
      return json({ error: e.message || "Read version failed" }, 500);
    }
  }

  // POST /api/versions/:file/restore  { id }
  if (parts.length === 2 && parts[1] === "restore" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const id = body.id;
    if (!id) return json({ error: "Missing version id" }, 400);
    try {
      const version = await readVersion(env.CONTENT, fileName, id);
      if (!version || !("data" in version)) return json({ error: "Version not found" }, 404);
      const key = normalizeKey(fileName);
      const prev = await readJson(env.CONTENT, key);
      if (prev !== null) {
        await saveVersionSnapshot(env.CONTENT, fileName, prev, { user });
      }
      const size = await writeJson(env.CONTENT, key, version.data);
      try {
        await deleteDraft(env.CONTENT, fileName);
      } catch (_) {}
      return json({
        ok: true,
        name: displayName(key),
        size,
        restoredFrom: id,
        data: version.data,
      });
    } catch (e) {
      return json({ error: e.message || "Restore failed" }, 500);
    }
  }

  return json({ error: "Not found" }, 404);
}

async function handleDrafts(request, env, parts, method) {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!env.CONTENT) return json({ error: "R2 binding CONTENT missing" }, 500);

  const fileName = parts[0];
  if (!fileName) return json({ error: "Missing file name" }, 400);

  if (method === "GET") {
    try {
      const draft = await readDraft(env.CONTENT, fileName);
      if (!draft) return json({ draft: null });
      return json({ draft });
    } catch (e) {
      return json({ error: e.message || "Read draft failed" }, 500);
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
      const draft = await writeDraft(env.CONTENT, fileName, body.data, { user });
      return json({ ok: true, draft });
    } catch (e) {
      return json({ error: e.message || "Save draft failed" }, 500);
    }
  }

  if (method === "DELETE") {
    try {
      await deleteDraft(env.CONTENT, fileName);
      return json({ ok: true });
    } catch (e) {
      return json({ error: e.message || "Delete draft failed" }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
