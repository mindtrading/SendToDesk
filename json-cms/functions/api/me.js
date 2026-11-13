import { requireUser, json } from "../_shared/auth.js";

export async function onRequestGet({ request, env }) {
  const user = await requireUser(request, env);
  if (!user) return json({ authenticated: false }, 401);
  return json({ authenticated: true, user });
}
