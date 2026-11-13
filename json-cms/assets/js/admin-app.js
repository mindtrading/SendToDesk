(function () {
  const state = {
    user: null,
    files: [],
    currentName: null,
    data: null,
    dirty: false,
    mode: "form", // form | raw
  };

  const $ = (sel) => document.querySelector(sel);

  async function api(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    let body = null;
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { error: text || "Invalid response" };
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || res.statusText);
      err.status = res.status;
      err.body = body;
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
  }

  function showApp() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = false;
    $("#user-label").textContent = state.user || "admin";
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

  function renderFileList() {
    const list = $("#file-list");
    list.innerHTML = "";
    if (!state.files.length) {
      list.innerHTML = '<p class="muted empty-hint">No JSON yet. Create one or seed samples.</p>';
      return;
    }
    state.files.forEach((f) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "file-item" + (f.name === state.currentName ? " active" : "");
      btn.innerHTML = `<span class="file-name">${escapeHtml(f.name)}</span><span class="file-meta">${formatSize(f.size)}</span>`;
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
      $("#current-file").textContent = res.name;
      $("#public-url").textContent = "/content/" + res.name;
      $("#public-url").href = "/content/" + res.name;
      renderEditor();
      renderFileList();
      setDirty(false);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function setDirty(v) {
    state.dirty = v;
    $("#dirty-dot").hidden = !v;
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
    if (state.mode === "raw") {
      try {
        state.data = JSON.parse($("#raw-editor").value);
      } catch {
        toast("Raw JSON is invalid", "error");
        return;
      }
    }
    try {
      await api("/api/files/" + encodeURIComponent(state.currentName).replace(/%2F/g, "/"), {
        method: "PUT",
        body: JSON.stringify({ data: state.data }),
      });
      setDirty(false);
      toast("Saved", "ok");
      await refreshFiles();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function createFile() {
    const name = prompt("New JSON file name (e.g. pages.json):");
    if (!name) return;
    let clean = name.trim().replace(/^\/+/, "");
    if (!clean.toLowerCase().endsWith(".json")) clean += ".json";
    try {
      await api("/api/files", {
        method: "POST",
        body: JSON.stringify({ name: clean, data: {} }),
      });
      toast("Created " + clean, "ok");
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
      toast("Deleted", "ok");
      await refreshFiles();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function seedSamples() {
    if (!confirm("Upload sample JSON files (site-settings, ads, blog) if missing?")) return;
    const samples = [
      "site-settings.json",
      "ads.json",
      "blog.json",
    ];
    for (const name of samples) {
      try {
        const res = await fetch("samples/" + name);
        if (!res.ok) throw new Error("Missing sample " + name);
        const data = await res.json();
        try {
          await api("/api/files", {
            method: "POST",
            body: JSON.stringify({ name, data }),
          });
        } catch (e) {
          if (e.status !== 409) throw e;
        }
      } catch (e) {
        toast(e.message, "error");
        return;
      }
    }
    toast("Samples ready", "ok");
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
      await refreshFiles();
    } catch (err) {
      $("#login-error").textContent = err.message;
      $("#login-error").hidden = false;
    }
  });

  $("#btn-logout").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST", body: "{}" });
    state.user = null;
    state.currentName = null;
    state.data = null;
    showLogin();
  });

  $("#btn-refresh").addEventListener("click", () => refreshFiles().catch((e) => toast(e.message, "error")));
  $("#btn-new").addEventListener("click", createFile);
  $("#btn-seed").addEventListener("click", seedSamples);
  $("#btn-save").addEventListener("click", saveFile);
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

  checkAuth();
})();
