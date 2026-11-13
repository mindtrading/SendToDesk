/** Pretty blog URLs: /blog/:slug → blog shell (client reads the path). */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  // /blog or /blog/ → let static assets handle the index
  if (parts.length <= 1) {
    return context.env.ASSETS.fetch(new URL("/blog/index.html", url.origin));
  }

  const req = new Request(new URL("/blog/index.html", url.origin), context.request);
  return context.env.ASSETS.fetch(req);
}
