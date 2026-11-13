function pathFromParams(params) {
  const p = params.path;
  if (Array.isArray(p)) return p.join("/");
  return p || "";
}

function safeMediaKey(raw) {
  let key = String(raw || "").replace(/^\/+/, "").replace(/\.\./g, "");
  if (!key || key.includes("\\") || key.includes("\0")) {
    throw new Error("Invalid path");
  }
  if (!key.startsWith("media/")) key = "media/" + key;
  return key;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env, params }) {
  if (!env.CONTENT) {
    return new Response("R2 binding missing", { status: 500, headers: CORS });
  }

  let key;
  try {
    key = safeMediaKey(pathFromParams(params));
  } catch (e) {
    return new Response(e.message, { status: 400, headers: CORS });
  }

  const obj = await env.CONTENT.get(key);
  if (!obj) {
    return new Response("Not found", { status: 404, headers: CORS });
  }

  const headers = new Headers(CORS);
  const ct = (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream";
  headers.set("Content-Type", ct);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (obj.httpMetadata && obj.httpMetadata.contentDisposition) {
    headers.set("Content-Disposition", obj.httpMetadata.contentDisposition);
  }

  return new Response(obj.body, { status: 200, headers });
}
