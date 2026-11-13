(function () {
  const state = {
    user: null,
    files: [],
    currentName: null,
    data: null,
    dirty: false,
    mode: "form", // form | raw
  };

  const THEME_KEY = "cs-theme";
  const $ = (sel) => document.querySelector(sel);

  function getTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (_) {}
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-theme-set") === next);
    });
  }

  function initTheme() {
    applyTheme(getTheme());
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.getAttribute("data-theme-set")));
    });
  }

  async function api(path, options = {}) {
    const { headers: extraHeaders, ...rest } = options;
    const res = await fetch(path, {
      credentials: "same-origin",
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(extraHeaders || {}),
      },
    });
    let body = null;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: text || "Invalid response" };
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || res.statusText || "Request failed");
      err.status = res.status;
      err.body = body;
      err.path = path;
      throw err;
    }
    return body;
  }

  function toast(msg, kind) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove("show"), 2800);
  }

  function showLogin() {
    $("#login-view").hidden = false;
    $("#app-view").hidden = true;
    const floatToggle = document.querySelector(".theme-toggle-float");
    if (floatToggle) floatToggle.hidden = false;
    const saveBar = $("#save-bar");
    if (saveBar) saveBar.hidden = true;
  }

  function showApp() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    $("#user-label").textContent = state.user || "admin";
    const floatToggle = document.querySelector(".theme-toggle-float");
    if (floatToggle) floatToggle.hidden = true;
  }

  async function checkAuth() {
    try {
      const me = await api("/api/me");
      state.user = me.user;
      showApp();
      await refreshFiles();
    } catch {
      showLogin();
    }
  }

  async function refreshFiles() {
    const { files } = await api("/api/files");
    state.files = files || [];
    renderFileList();
  }

  function prettyName(name) {
    return String(name || "")
      .replace(/\.json$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function renderFileList() {
    const list = $("#file-list");
    list.innerHTML = "";
    if (!state.files.length) {
      list.innerHTML = '<p class="muted empty-hint">No content yet. Click Load demos to start.</p>';
      return;
    }
    state.files.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "file-item" + (f.name === state.currentName ? " active" : "");
      btn.innerHTML = `<span class="file-name">${escapeHtml(prettyName(f.name))}</span><span class="file-meta">${escapeHtml(f.name)}</span>`;
      btn.addEventListener("click", () => openFile(f.name));
      list.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatSize(n) {
    if (n == null) return "";
    if (n < 1024) return n + " B";
    return (n / 1024).toFixed(1) + " KB";
  }

  async function openFile(name) {
    if (state.dirty && !confirm("Unsaved changes. Discard?")) return;
    try {
      const res = await api("/api/files/" + encodeURIComponent(name).replace(/%2F/g, "/"));
      state.currentName = res.name;
      state.data = res.data;
      state.dirty = false;
      $("#editor-empty").hidden = true;
      $("#editor-panel").hidden = false;
      $("#current-file").textContent = prettyName(res.name);
      $("#public-url").textContent = "/content/" + res.name;
      $("#public-url").href = "/content/" + res.name;
      $("#save-bar").hidden = false;
      $("#save-bar-file").textContent = prettyName(res.name);
      state.snapshot = JSON.stringify(res.data);
      renderEditor();
      renderFileList();
      setDirty(false);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function setDirty(v) {
    state.dirty = !!v;
    const dirty = state.dirty;
    $("#dirty-dot").hidden = !dirty;
    const status = $("#save-bar-status");
    if (status) {
      status.textContent = dirty ? "Unsaved changes" : "All changes saved";
      status.classList.toggle("is-dirty", dirty);
      status.classList.toggle("is-saved", !dirty);
    }
    const discard = $("#btn-discard");
    if (discard) discard.hidden = !dirty;
    document.querySelectorAll(".btn-save-main, .btn-save-top").forEach((btn) => {
      btn.classList.toggle("is-pulse", dirty);
      btn.disabled = false;
    });
  }

  function renderEditor() {
    if (state.mode === "raw") {
      $("#form-root").hidden = true;
      $("#raw-root").hidden = false;
      $("#raw-editor").value = JSON.stringify(state.data, null, 2);
    } else {
      $("#raw-root").hidden = true;
      $("#form-root").hidden = false;
      FormEngine.render($("#form-root"), state.data, {
        onChange: (next) => {
          state.data = next;
          setDirty(true);
        },
        onStructure: (next) => {
          state.data = next;
          setDirty(true);
          renderEditor();
        },
      });
    }
    $("#tab-form").classList.toggle("active", state.mode === "form");
    $("#tab-raw").classList.toggle("active", state.mode === "raw");
  }

  async function saveFile() {
    if (!state.currentName) return;
    if (window.FormEngine && typeof FormEngine.flushRichEditors === "function") {
      FormEngine.flushRichEditors();
    }
    if (state.mode === "raw") {
      try {
        state.data = JSON.parse($("#raw-editor").value);
      } catch {
        toast("Advanced content is invalid", "error");
        return;
      }
    }
    const buttons = document.querySelectorAll(".btn-save-main, .btn-save-top");
    buttons.forEach((btn) => {
      btn.disabled = true;
      btn.dataset.label = btn.textContent;
      btn.textContent = "Saving…";
    });
    try {
      await api("/api/files/" + encodeURIComponent(state.currentName).replace(/%2F/g, "/"), {
        method: "PUT",
        body: JSON.stringify({ data: state.data }),
      });
      state.snapshot = JSON.stringify(state.data);
      setDirty(false);
      toast("Saved · " + prettyName(state.currentName), "ok");
      await refreshFiles();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      buttons.forEach((btn) => {
        btn.disabled = false;
        btn.textContent = btn.dataset.label || "Save changes";
      });
    }
  }

  async function discardChanges() {
    if (!state.currentName || !state.dirty) return;
    if (!confirm("Discard unsaved changes?")) return;
    try {
      state.data = JSON.parse(state.snapshot || "{}");
      setDirty(false);
      renderEditor();
      toast("Changes discarded", "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function createFile() {
    const name = prompt("New content name (e.g. promotions or blog):");
    if (!name) return;
    let clean = name.trim().replace(/^\/+/, "");
    if (!clean.toLowerCase().endsWith(".json")) clean += ".json";
    const starter = {
      title: prettyName(clean),
      published: false,
      body: "<p>Start writing here…</p>",
    };
    try {
      await api("/api/files", {
        method: "POST",
        body: JSON.stringify({ name: clean, data: starter }),
      });
      toast("Created " + prettyName(clean), "ok");
      await refreshFiles();
      await openFile(clean);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function deleteFile() {
    if (!state.currentName) return;
    if (!confirm("Delete " + state.currentName + "?")) return;
    try {
      await api("/api/files/" + encodeURIComponent(state.currentName).replace(/%2F/g, "/"), {
        method: "DELETE",
      });
      state.currentName = null;
      state.data = null;
      state.dirty = false;
      $("#editor-panel").hidden = true;
      $("#editor-empty").hidden = false;
      $("#save-bar").hidden = true;
      toast("Deleted", "ok");
      await refreshFiles();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function seedSamples() {
    if (!confirm("Load demo content (settings, blog HTML, ads, pages, FAQ, team, all-types)? Existing demos will be refreshed.")) return;
    const samples = [
      "site-settings.json",
      "blog.json",
      "ads.json",
      "pages.json",
      "faq.json",
      "team.json",
      "all-types-demo.json",
    ];
    let count = 0;
    for (const name of samples) {
      try {
        const res = await fetch("samples/" + name + "?v=3");
        if (!res.ok) throw new Error("Missing demo " + name);
        const data = await res.json();
        try {
          await api("/api/files", {
            method: "POST",
            body: JSON.stringify({ name, data }),
          });
        } catch (e) {
          if (e.status !== 409) throw e;
          await api("/api/files/" + encodeURIComponent(name), {
            method: "PUT",
            body: JSON.stringify({ data }),
          });
        }
        count += 1;
      } catch (e) {
        toast(e.message, "error");
        return;
      }
    }
    toast("Demos ready (" + count + ")", "ok");
    await refreshFiles();
  }

  // Events
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;
    $("#login-error").hidden = true;
    try {
      const res = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      state.user = res.user;
      showApp();
      try {
        await refreshFiles();
      } catch (listErr) {
        toast(listErr.message || "Could not load files", "error");
      }
    } catch (err) {
      showLogin();
      $("#login-error").textContent = err.message;
      $("#login-error").hidden = false;
    }
  });

  $("#btn-logout").addEventListener("click", async () => {
    if (state.dirty && !confirm("You have unsaved changes. Logout anyway?")) return;
    try {
      await api("/api/logout", { method: "POST", body: "{}" });
    } catch (_) {}
    if (window.FormEngine && FormEngine.destroyRichEditors) FormEngine.destroyRichEditors();
    state.user = null;
    state.currentName = null;
    state.data = null;
    state.snapshot = null;
    state.dirty = false;
    $("#editor-panel").hidden = true;
    $("#editor-empty").hidden = false;
    showLogin();
  });

  $("#btn-refresh").addEventListener("click", () => refreshFiles().catch((e) => toast(e.message, "error")));
  $("#btn-new").addEventListener("click", createFile);
  $("#btn-seed").addEventListener("click", seedSamples);
  $("#btn-save").addEventListener("click", saveFile);
  const saveTop = $("#btn-save-top");
  if (saveTop) saveTop.addEventListener("click", saveFile);
  const discardBtn = $("#btn-discard");
  if (discardBtn) discardBtn.addEventListener("click", discardChanges);
  $("#btn-delete").addEventListener("click", deleteFile);
  $("#tab-form").addEventListener("click", () => {
    if (state.mode === "raw") {
      try {
        state.data = JSON.parse($("#raw-editor").value);
      } catch {
        toast("Fix raw JSON before switching", "error");
        return;
      }
    }
    state.mode = "form";
    renderEditor();
  });
  $("#tab-raw").addEventListener("click", () => {
    state.mode = "raw";
    renderEditor();
  });
  $("#raw-editor").addEventListener("input", () => setDirty(true));

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (state.currentName) saveFile();
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  initTheme();
  checkAuth();
})();
