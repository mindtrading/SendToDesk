(function () {
  var cfg = {
    siteName: "SendToDesk",
    tagline: "Phone to Windows PC over Wi‑Fi",
    version: "1.0.0",
    email: "mindtradingapp@gmail.com",
    windows: "https://pub-39a92e5168a84fd6a714627aef76b5f1.r2.dev/SendToDesk_1.0.zip",
    play: "https://play.google.com/store/apps/details?id=com.docs.scan.sendtodesk",
    themeColor: "",
    hero: {
      title: "",
      subtitle: "",
      ctaLabel: "",
      imageUrl: "",
    },
  };

  function contentUrl(name) {
    return "/content/" + encodeURIComponent(name).replace(/%2F/g, "/");
  }

  function rootHref(path) {
    if (/^https?:\/\//i.test(path)) return path;
    var here = location.pathname;
    if (
      here.indexOf("/privacy") !== -1 ||
      here.indexOf("/terms") !== -1 ||
      here.indexOf("/support") !== -1 ||
      here.indexOf("/install") !== -1 ||
      here.indexOf("/blog") !== -1
    ) {
      return "../" + path.replace(/^\//, "");
    }
    return path;
  }

  function blogHref(slug) {
    var base = location.pathname.indexOf("/blog") !== -1 ? "./" : "blog/";
    return base + "?slug=" + encodeURIComponent(slug);
  }

  function applyDownloads() {
    document.querySelectorAll("[data-dl]").forEach(function (el) {
      var kind = el.getAttribute("data-dl");
      if (kind === "windows") {
        el.setAttribute("href", rootHref(cfg.windows));
        el.setAttribute("download", "SendToDesk-" + cfg.version + "-windows.zip");
      }
      if (kind === "play") el.setAttribute("href", cfg.play);
    });

    document.querySelectorAll("[data-version]").forEach(function (el) {
      el.textContent = cfg.version;
    });

    document.querySelectorAll("[data-email]").forEach(function (el) {
      el.setAttribute("href", "mailto:" + cfg.email);
      el.textContent = cfg.email;
    });

    document.querySelectorAll('.dl-card[data-os="windows"]').forEach(function (card) {
      card.classList.add("preferred");
    });
  }

  function setText(sel, value) {
    if (!value) return;
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = value;
    });
  }

  function isPlaceholder(value) {
    if (!value) return true;
    return /example\.com|example\.org|placeholder|yourdomain|changeme/i.test(
      String(value)
    );
  }

  function applySettings(data) {
    if (!data || typeof data !== "object") return;
    if (data.published === false) return;

    if (data.siteName) cfg.siteName = String(data.siteName);
    if (data.tagline) cfg.tagline = String(data.tagline);
    if (data.supportEmail && !isPlaceholder(data.supportEmail)) {
      cfg.email = String(data.supportEmail);
    }
    if (data.themeColor) cfg.themeColor = String(data.themeColor);

    var dl = data.download || {};
    if (dl.version) cfg.version = String(dl.version);
    if (dl.windowsUrl && !isPlaceholder(dl.windowsUrl)) {
      cfg.windows = String(dl.windowsUrl);
    }
    if (dl.playStoreUrl && !isPlaceholder(dl.playStoreUrl)) {
      cfg.play = String(dl.playStoreUrl);
    }

    var hero = data.hero || {};
    cfg.hero = {
      title: hero.title ? String(hero.title) : "",
      subtitle: hero.subtitle ? String(hero.subtitle) : "",
      ctaLabel: hero.ctaLabel ? String(hero.ctaLabel) : "",
      imageUrl: hero.imageUrl ? String(hero.imageUrl) : "",
    };

    setText("[data-cms=\"site-name\"]", cfg.siteName);
    setText("[data-cms=\"tagline\"]", cfg.tagline);

    if (cfg.hero.title) setText("[data-cms=\"hero-title\"]", cfg.hero.title);
    if (cfg.hero.subtitle) setText("[data-cms=\"hero-subtitle\"]", cfg.hero.subtitle);
    if (cfg.hero.ctaLabel) {
      document.querySelectorAll("[data-cms=\"hero-cta\"]").forEach(function (el) {
        el.textContent = cfg.hero.ctaLabel;
      });
    }
    if (cfg.hero.imageUrl) {
      document.querySelectorAll("[data-cms=\"hero-image\"]").forEach(function (el) {
        el.setAttribute("src", cfg.hero.imageUrl);
      });
    }

    if (cfg.themeColor) {
      document.documentElement.style.setProperty("--teal", cfg.themeColor);
      var themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute("content", cfg.themeColor);
    }

    if (cfg.siteName) {
      var titleEl = document.querySelector("title");
      if (titleEl && document.body && document.body.dataset.page === "home") {
        titleEl.textContent = cfg.siteName + " — " + (cfg.tagline || "Phone to Windows PC");
      }
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", cfg.siteName);
    }
    if (cfg.hero.subtitle) {
      var desc = document.querySelector('meta[name="description"]');
      if (desc && document.body && document.body.dataset.page === "home") {
        desc.setAttribute("content", cfg.hero.subtitle);
      }
    }

    applyDownloads();
  }

  function publishedPosts(data) {
    var posts = (data && data.posts) || [];
    return posts
      .filter(function (p) {
        return p && p.published !== false && (p.title || p.slug);
      })
      .slice()
      .sort(function (a, b) {
        return String(b.date || "").localeCompare(String(a.date || ""));
      });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function readingTime(html) {
    var text = String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    var words = text ? text.split(" ").length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }

  function shareButtons(title) {
    var url = encodeURIComponent(location.href);
    var text = encodeURIComponent(title || "SendToDesk");
    return (
      '<div class="blog-share" aria-label="Share">' +
      '<a class="blog-share-btn" href="https://wa.me/?text=' +
      text +
      "%20" +
      url +
      '" target="_blank" rel="noopener" title="WhatsApp" aria-label="Share on WhatsApp">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.5-1-.9-1.5-1.9-1.6-2.2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3z"/><path fill="currentColor" d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>' +
      "</a>" +
      '<a class="blog-share-btn" href="https://twitter.com/intent/tweet?url=' +
      url +
      "&text=" +
      text +
      '" target="_blank" rel="noopener" title="X" aria-label="Share on X">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18.2 2H21l-6.6 7.5L22 22h-6.8l-4.4-6.1L5.2 22H2.4l7-8L2 2h7l4 5.6L18.2 2zm-1.2 18h1.9L7.1 3.9H5.1L17 20z"/></svg>' +
      "</a>" +
      '<button type="button" class="blog-share-btn" data-copy-link title="Copy link" aria-label="Copy link">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L11 5"/><path fill="none" stroke="currentColor" stroke-width="2" d="M14 11a5 5 0 0 0-7.1 0L4.8 13.1a5 5 0 0 0 7.1 7.1L13 19"/></svg>' +
      "</button>" +
      "</div>"
    );
  }

  function recentPostsHtml(posts, currentSlug) {
    var items = posts
      .filter(function (p) {
        var s = p.slug || p.id || "";
        return s && s !== currentSlug;
      })
      .slice(0, 6);
    if (!items.length) {
      return '<p class="blog-aside-empty">More stories coming soon.</p>';
    }
    return (
      '<ul class="blog-recent-list">' +
      items
        .map(function (p) {
          var s = p.slug || p.id || "";
          return (
            '<li><a href="' +
            escapeHtml(blogHref(s)) +
            '">' +
            escapeHtml(p.title || "Untitled") +
            "</a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function bindBlogShare() {
    var btn = document.querySelector("[data-copy-link]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var done = function () {
        btn.classList.add("is-copied");
        btn.setAttribute("aria-label", "Link copied");
        setTimeout(function () {
          btn.classList.remove("is-copied");
          btn.setAttribute("aria-label", "Copy link");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(location.href).then(done).catch(done);
      } else {
        done();
      }
    });
  }

  function renderBlogList(posts) {
    var list = document.getElementById("blog-list");
    var section = document.getElementById("blog");
    if (!list) return;
    if (!posts.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    list.innerHTML = posts
      .map(function (p) {
        var slug = p.slug || p.id || "";
        var img = p.imageUrl
          ? '<img class="blog-card-img" src="' +
            escapeHtml(p.imageUrl) +
            '" alt="" loading="lazy" width="640" height="360" />'
          : "";
        return (
          '<article class="blog-card">' +
          img +
          '<div class="blog-card-body">' +
          (p.date ? '<time datetime="' + escapeHtml(p.date) + '">' + escapeHtml(formatDate(p.date)) + "</time>" : "") +
          "<h3><a href=\"" +
          escapeHtml(blogHref(slug)) +
          '">' +
          escapeHtml(p.title || "Untitled") +
          "</a></h3>" +
          (p.excerpt ? "<p>" + escapeHtml(p.excerpt) + "</p>" : "") +
          '<a class="blog-more" href="' +
          escapeHtml(blogHref(slug)) +
          '">Read more</a>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function renderBlogPage(posts) {
    var mount = document.getElementById("blog-mount");
    if (!mount) return;
    var slug = new URLSearchParams(location.search).get("slug") || "";

    if (!slug) {
      document.title = "Blog — " + cfg.siteName;
      document.body.classList.remove("is-article");
      if (!posts.length) {
        mount.innerHTML = '<div class="blog-index"><p class="blog-empty">No posts published yet.</p></div>';
        return;
      }
      mount.innerHTML =
        '<div class="blog-index">' +
        '<p class="blog-index-kicker">Journal</p>' +
        "<h1>Blog</h1>" +
        '<p class="blog-index-lead">Guides and updates from the SendToDesk team.</p>' +
        '<div class="blog-grid">' +
        posts
          .map(function (p) {
            var s = p.slug || p.id || "";
            var mins = readingTime(p.body || p.excerpt || "");
            return (
              '<article class="blog-card">' +
              (p.imageUrl
                ? '<a class="blog-card-media" href="' +
                  escapeHtml(blogHref(s)) +
                  '"><img class="blog-card-img" src="' +
                  escapeHtml(p.imageUrl) +
                  '" alt="" loading="lazy" /></a>'
                : "") +
              '<div class="blog-card-body">' +
              '<div class="blog-card-meta">' +
              (p.date ? "<time>" + escapeHtml(formatDate(p.date)) + "</time>" : "") +
              "<span>" +
              mins +
              " min read</span>" +
              "</div>" +
              "<h3><a href=\"" +
              escapeHtml(blogHref(s)) +
              '">' +
              escapeHtml(p.title || "Untitled") +
              "</a></h3>" +
              (p.excerpt ? "<p>" + escapeHtml(p.excerpt) + "</p>" : "") +
              '<a class="blog-more" href="' +
              escapeHtml(blogHref(s)) +
              '">Read article</a>' +
              "</div></article>"
            );
          })
          .join("") +
        "</div></div>";
      return;
    }

    var post = posts.find(function (p) {
      return p.slug === slug || p.id === slug;
    });
    if (!post) {
      document.body.classList.remove("is-article");
      mount.innerHTML =
        '<div class="blog-index"><p class="blog-empty">Post not found. <a href="./">Back to all posts</a></p></div>';
      return;
    }

    document.title = (post.title || "Post") + " — " + cfg.siteName;
    document.body.classList.add("is-article");
    var mins = readingTime(post.body || post.excerpt || "");
    var ctaLabel = (cfg.hero && cfg.hero.ctaLabel) || "Download now";
    mount.innerHTML =
      '<div class="blog-layout">' +
      '<article class="blog-article">' +
      '<nav class="blog-crumb" aria-label="Breadcrumb"><a href="./">Blog</a><span aria-hidden="true">/</span><span>Article</span></nav>' +
      "<h1>" +
      escapeHtml(post.title || "Untitled") +
      "</h1>" +
      '<div class="blog-meta-row">' +
      (post.date
        ? '<span class="blog-meta-item"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M3 10h18M8 3v4M16 3v4"/></svg><time datetime="' +
          escapeHtml(post.date) +
          '">' +
          escapeHtml(formatDate(post.date)) +
          "</time></span>"
        : "") +
      '<span class="blog-meta-item"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 7v5l3 2"/></svg>' +
      mins +
      " min read</span>" +
      "</div>" +
      shareButtons(post.title) +
      (post.imageUrl
        ? '<img class="blog-hero-img" src="' +
          escapeHtml(post.imageUrl) +
          '" alt="" width="960" height="540" />'
        : "") +
      (post.excerpt ? '<p class="blog-deck">' + escapeHtml(post.excerpt) + "</p>" : "") +
      '<div class="blog-body">' +
      (post.body || "") +
      "</div>" +
      '<div class="blog-article-foot"><a class="blog-back" href="./">← All posts</a></div>' +
      "</article>" +
      '<aside class="blog-aside">' +
      '<div class="blog-cta-card">' +
      "<h2>Move files the fast way</h2>" +
      "<p>Scan on Android. Send to Windows over the same Wi‑Fi — no cloud upload.</p>" +
      '<a class="blog-cta-btn" href="' +
      escapeHtml(rootHref("#download")) +
      '">' +
      escapeHtml(ctaLabel) +
      "</a>" +
      "</div>" +
      '<div class="blog-recent">' +
      "<h3>Recent Posts</h3>" +
      recentPostsHtml(posts, slug) +
      "</div>" +
      "</aside>" +
      "</div>";
    bindBlogShare();
  }

  async function fetchJson(name) {
    try {
      var res = await fetch(contentUrl(name), { credentials: "omit" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  applyDownloads();

  var btn = document.querySelector(".menu-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
  }

  Promise.all([fetchJson("site-settings.json"), fetchJson("blog.json")]).then(
    function (results) {
      var settings = results[0];
      var blog = results[1];
      if (settings) applySettings(settings);
      var posts = publishedPosts(blog);
      renderBlogList(posts);
      renderBlogPage(posts);
    }
  ).catch(function () {
    var mount = document.getElementById("blog-mount");
    if (mount) {
      mount.innerHTML =
        '<div class="blog-index"><p class="blog-empty">Could not load blog content. <a href="./">Retry</a></p></div>';
    }
  });

  var hero = document.querySelector(".hero");
  var canvas = document.querySelector(".hero-particles");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hero && canvas && !reduce) {
    var ctx = canvas.getContext("2d");
    var dots = [];
    var raf = 0;
    var running = false;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: h };
    }

    var packets = [];
    var kinds = ["PDF", "JPG", "PNG", "Scan"];
    var pulse = 0;

    function seed() {
      var dim = size();
      var count = dim.w < 700 ? 28 : 48;
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * dim.w,
          y: Math.random() * dim.h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.4 + 0.5,
        });
      }
      packets = [];
      for (var j = 0; j < 5; j++) spawn(j / 5);
    }

    function spawn(offset) {
      var send = Math.random() > 0.28;
      packets.push({
        t: offset || 0,
        speed: 0.00105 + Math.random() * 0.0007,
        lane: 0.22 + Math.random() * 0.56,
        send: send,
        kind: kinds[Math.floor(Math.random() * kinds.length)],
        trail: [],
      });
    }

    function pathPoint(p, w, h) {
      var t = p.send ? p.t : 1 - p.t;
      var x = w * (0.06 + t * 0.88);
      var y = h * p.lane + Math.sin(t * Math.PI * 2) * 18;
      return { x: x, y: y };
    }

    function roundRect(x, y, rw, rh, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, r);
      ctx.arcTo(x + rw, y + rh, x, y + rh, r);
      ctx.arcTo(x, y + rh, x, y, r);
      ctx.arcTo(x, y, x + rw, y, r);
      ctx.closePath();
    }

    function tick() {
      if (!running) return;
      var w = hero.clientWidth;
      var h = hero.clientHeight;
      pulse += 0.008;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(15, 118, 110, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.06, h * 0.5);
      ctx.bezierCurveTo(w * 0.32, h * 0.18, w * 0.68, h * 0.82, w * 0.94, h * 0.5);
      ctx.stroke();

      var wifiX = [w * 0.1, w * 0.9];
      for (var n = 0; n < wifiX.length; n++) {
        for (var k = 1; k <= 3; k++) {
          var rr = 10 + k * 16 + (pulse % 1) * 10;
          ctx.beginPath();
          ctx.arc(wifiX[n], h * 0.5, rr, Math.PI * 1.15, Math.PI * 1.85, n === 1);
          ctx.strokeStyle = "rgba(13, 148, 136," + (0.28 - k * 0.05) + ")";
          ctx.stroke();
        }
      }

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        var fade = d.x < w * 0.42 ? 0.28 : 0.55;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255," + fade + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(45, 212, 191," + fade + ")";
        ctx.fill();
      }

      if (packets.length < 6 && Math.random() < 0.012) spawn(0);

      for (var p = packets.length - 1; p >= 0; p--) {
        var pkt = packets[p];
        pkt.t += pkt.speed;
        var pt = pathPoint(pkt, w, h);
        pkt.trail.push({ x: pt.x, y: pt.y });
        if (pkt.trail.length > 10) pkt.trail.shift();
        for (var t = 0; t < pkt.trail.length; t++) {
          ctx.beginPath();
          ctx.arc(pkt.trail[t].x, pkt.trail[t].y, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(94, 234, 212," + (t / pkt.trail.length) * 0.45 + ")";
          ctx.fill();
        }
        var dimFade = pt.x < w * 0.42 ? 0.55 : 1;
        ctx.globalAlpha = dimFade * Math.min(1, pkt.t * 8) * (pkt.t > 0.92 ? (1 - pkt.t) / 0.08 : 1);
        roundRect(pt.x - 22, pt.y - 11, 44, 22, 6);
        ctx.fillStyle = pkt.send ? "rgba(236, 253, 245, 0.95)" : "rgba(254, 243, 199, 0.95)";
        ctx.fill();
        ctx.strokeStyle = pkt.send ? "rgba(15, 118, 110, 0.35)" : "rgba(217, 119, 6, 0.35)";
        ctx.stroke();
        ctx.fillStyle = pkt.send ? "#0f766e" : "#92400e";
        ctx.font = "700 9px Plus Jakarta Sans, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pkt.kind, pt.x, pt.y);
        ctx.globalAlpha = 1;
        if (pkt.t >= 1) packets.splice(p, 1);
      }

      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      tick();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    seed();
    window.addEventListener("resize", seed);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) start();
          else stop();
        },
        { threshold: 0.05 }
      );
      io.observe(hero);
    } else {
      start();
    }
  }
})();
