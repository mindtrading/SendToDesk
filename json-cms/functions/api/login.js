import {
  createSessionToken,
  sessionCookie,
  timingSafeEqual,
  json,
} from "../_shared/auth.js";

export async function onRequestPost({ request, env }) {
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
