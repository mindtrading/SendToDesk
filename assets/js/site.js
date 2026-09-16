(function () {
  var cfg = {
    version: "1.0.0",
    email: "hello@sendtodesk.app",
    windows: "downloads/SendToDesk-1.0.0-windows.zip",
    play: "https://play.google.com/store/apps/details?id=com.docs.scan.sendtodesk",
  };

  document.querySelectorAll("[data-dl]").forEach(function (el) {
    var kind = el.getAttribute("data-dl");
    if (kind === "windows") el.setAttribute("href", rootHref(cfg.windows));
    if (kind === "play") el.setAttribute("href", cfg.play);
  });

  document.querySelectorAll("[data-version]").forEach(function (el) {
    el.textContent = cfg.version;
  });

  document.querySelectorAll("[data-email]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + cfg.email);
    el.textContent = cfg.email;
  });

  document.querySelectorAll(".dl-card[data-os=\"windows\"]").forEach(function (card) {
    card.classList.add("preferred");
  });

  var btn = document.querySelector(".menu-btn");
  if (btn) {
    btn.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
  }

  function rootHref(path) {
    var here = location.pathname;
    if (here.indexOf("/privacy") !== -1 || here.indexOf("/terms") !== -1 || here.indexOf("/support") !== -1 || here.indexOf("/install") !== -1) {
      return "../" + path;
    }
    return path;
  }

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
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start();
        else stop();
      }, { threshold: 0.05 });
      io.observe(hero);
    } else {
      start();
    }
  }
})();
