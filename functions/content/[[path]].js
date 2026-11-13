import { normalizeKey, readJson } from "../_shared/r2.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function pathFromParams(params) {
  const p = params.path;
  if (Array.isArray(p)) return p.join("/");
  return p || "";
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env, params }) {
  if (!env.CONTENT) {
    return new Response(JSON.stringify({ error: "R2 binding missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  let key;
  try {
    key = normalizeKey(pathFromParams(params));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  try {
    const data = await readJson(env.CONTENT, key);
    if (data === null) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        ...CORS,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Read failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
