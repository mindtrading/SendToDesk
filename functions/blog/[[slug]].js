/** Pretty blog URLs: /blog/:slug → blog shell (client reads the path). */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  // Fetch the blog index asset. Avoid /blog/index.html — Pages may 308 that to /blog/
  // and leak Location to the browser, wiping the slug from the address bar.
  let assetRes = await context.env.ASSETS.fetch(new URL("/blog/", url.origin), {
    redirect: "manual",
  });

  if (assetRes.status >= 300 && assetRes.status < 400) {
    const loc = assetRes.headers.get("Location") || "/blog/";
    assetRes = await context.env.ASSETS.fetch(new URL(loc, url.origin));
  }

  const headers = new Headers(assetRes.headers);
  headers.delete("Location");
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");

  return new Response(assetRes.body, {
    status: 200,
    headers,
  });
}
