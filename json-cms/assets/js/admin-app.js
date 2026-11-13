(function () {
  const state = {
    user: null,
    files: [],
    currentName: null,
    data: null,
    dirty: false,
    mode: "form", // form | raw
    template: null,
    pickTemplateId: "blog",
    draftTimer: null,
    lastDraftAt: null,
    autosaveBusy: false,
  };

  const THEME_KEY = "cs-theme";
  const DRAFT_PREFIX = "cs-draft:";
  const AUTOSAVE_MS = 8000;
  const $ = (sel) => document.querySelector(sel);

  function draftLocalKey(name) {
    return DRAFT_PREFIX + name;
  }

  function writeLocalDraft(name, data) {
    try {
      localStorage.setItem(
        draftLocalKey(name),
        JSON.stringify({ updatedAt: new Date().toISOString(), data })
      );
    } catch (_) {}
  }

  function readLocalDraft(name) {
    try {
      const raw = localStorage.getItem(draftLocalKey(name));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function clearLocalDraft(name) {
    try {
      localStorage.removeItem(draftLocalKey(name));
    } catch (_) {}
  }

  function setDraftStatus(text, kind) {
    const el = $("#draft-status");
    if (!el) return;
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle("is-ok", kind === "ok");
    el.classList.toggle("is-warn", kind === "warn");
  }

  function scheduleAutosave() {
    if (state.draftTimer) clearTimeout(state.draftTimer);
    state.draftTimer = setTimeout(() => {
      autosaveDraft().catch(() => {});
    }, AUTOSAVE_MS);
  }

  async function autosaveDraft() {
    if (!state.currentName || !state.dirty || state.autosaveBusy) return;
    if (window.FormEngine && FormEngine.flushRichEditors) FormEngine.flushRichEditors();
    state.autosaveBusy = true;
    setDraftStatus("Saving draft…", "warn");
    try {
      writeLocalDraft(state.currentName, state.data);
      await api("/api/drafts/" + encodeURIComponent(state.currentName), {
        method: "PUT",
        body: JSON.stringify({ data: state.data }),
      });
      state.lastDraftAt = new Date();
      setDraftStatus(
        "Draft saved · " + state.lastDraftAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        "ok"
      );
    } catch (e) {
      setDraftStatus("Local draft only · " + (e.message || "server draft failed"), "warn");
    } finally {
      state.autosaveBusy = false;
    }
  }

  async function maybeOfferDraft(name, savedData) {
    let serverDraft = null;
    try {
      const res = await api("/api/drafts/" + encodeURIComponent(name));
      serverDraft = res.draft;
    } catch (_) {}
    const localDraft = readLocalDraft(name);
    const candidates = [];
    if (serverDraft && serverDraft.data) {
      candidates.push({ source: "server", updatedAt: serverDraft.updatedAt, data: serverDraft.data });
    }
    if (localDraft && localDraft.data) {
      candidates.push({ source: "local", updatedAt: localDraft.updatedAt, data: localDraft.data });
    }
    if (!candidates.length) return null;

    candidates.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const best = candidates[0];
    const savedStr = JSON.stringify(savedData);
    const draftStr = JSON.stringify(best.data);
    if (draftStr === savedStr) return null;

    const when = best.updatedAt ? new Date(best.updatedAt).toLocaleString() : "unknown time";
    const ok = confirm(
      "A newer draft was found (" + best.source + ", " + when + ").\n\nRestore draft?"
    );
    return ok ? best.data : null;
  }

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

  const setupState = {
    step: 1,
    packs: [],
    status: null,
  };

  function showLogin() {
    $("#login-view").hidden = false;
    const setup = $("#setup-view");
    if (setup) setup.hidden = true;
    $("#app-view").hidden = true;
    const floatToggle = document.querySelector(".theme-toggle-float");
    if (floatToggle) floatToggle.hidden = false;
    const saveBar = $("#save-bar");
    if (saveBar) saveBar.hidden = true;
  }

  function showApp() {
    $("#login-view").hidden = true;
    const setup = $("#setup-view");
    if (setup) setup.hidden = true;
    $("#app-view").hidden = false;
    $("#user-label").textContent = state.user || "admin";
    const floatToggle = document.querySelector(".theme-toggle-float");
    if (floatToggle) floatToggle.hidden = true;
  }

  function showSetup() {
    $("#login-view").hidden = true;
    $("#app-view").hidden = true;
    const setup = $("#setup-view");
    if (setup) setup.hidden = false;
    const floatToggle = document.querySelector(".theme-toggle-float");
    if (floatToggle) floatToggle.hidden = false;
    const saveBar = $("#save-bar");
    if (saveBar) saveBar.hidden = true;
    goSetupStep(1);
  }

  function goSetupStep(step) {
    setupState.step = step;
    document.querySelectorAll(".setup-panel").forEach((panel) => {
      panel.hidden = Number(panel.getAttribute("data-panel")) !== step;
    });
    document.querySelectorAll("#setup-steps li").forEach((li) => {
      const n = Number(li.getAttribute("data-step"));
      li.classList.toggle("is-active", n === step);
      li.classList.toggle("is-done", n < step);
    });
    const bar = $("#setup-progress-bar");
    if (bar) bar.style.width = (step / 5) * 100 + "%";
    if (step === 4) renderSetupPacks();
    if (step === 5) renderSetupReview();
  }

  function renderSetupPacks() {
    const root = $("#setup-packs");
    if (!root) return;
    const packs = (setupState.status && setupState.status.packs) || [
      { id: "blog", label: "Blog", description: "Posts with HTML body" },
      { id: "faq", label: "FAQ", description: "Questions and answers" },
      { id: "pages", label: "Pages", description: "Static pages" },
      { id: "ads", label: "Ads", description: "Ad slots" },
      { id: "team", label: "Team", description: "Team members" },
    ];
    const selected = new Set(
      setupState.packs.length ? setupState.packs : ["blog", "faq", "pages"]
    );
    root.innerHTML = packs
      .map((p) => {
        const checked = selected.has(p.id) ? "checked" : "";
        return (
          '<label class="setup-pack">' +
          '<input type="checkbox" name="setup-pack" value="' +
          escapeHtml(p.id) +
          '" ' +
          checked +
          " />" +
          "<div><strong>" +
          escapeHtml(p.label) +
          "</strong><span>" +
          escapeHtml(p.description || "") +
          "</span></div></label>"
        );
      })
      .join("");
  }

  function selectedPacks() {
    return Array.from(document.querySelectorAll('input[name="setup-pack"]:checked')).map(
      (el) => el.value
    );
  }

  function collectSetupPayload() {
    setupState.packs = selectedPacks();
    return {
      siteName: ($("#setup-site-name") && $("#setup-site-name").value.trim()) || "My Site",
      tagline: ($("#setup-tagline") && $("#setup-tagline").value.trim()) || "",
      supportEmail: ($("#setup-email") && $("#setup-email").value.trim()) || "",
      themeColor: ($("#setup-theme") && $("#setup-theme").value) || "#1d4ed8",
      heroTitle: ($("#setup-hero-title") && $("#setup-hero-title").value.trim()) || "",
      heroSubtitle: ($("#setup-hero-sub") && $("#setup-hero-sub").value.trim()) || "",
      ctaLabel: ($("#setup-cta") && $("#setup-cta").value.trim()) || "Download now",
      version: ($("#setup-version") && $("#setup-version").value.trim()) || "1.0.0",
      windowsUrl: ($("#setup-windows") && $("#setup-windows").value.trim()) || "",
      playStoreUrl: ($("#setup-play") && $("#setup-play").value.trim()) || "",
      packs: setupState.packs,
      overwrite: true,
    };
  }

  function renderSetupReview() {
    const payload = collectSetupPayload();
    const root = $("#setup-review");
    if (!root) return;
    const rows = [
      ["Site", payload.siteName],
      ["Email", payload.supportEmail || "—"],
      ["Version", payload.version],
      ["Packs", payload.packs.length ? payload.packs.join(", ") : "settings only"],
      ["Live file", "/content/site-settings.json"],
    ];
    root.innerHTML = rows
      .map(
        (r) =>
          "<div><span class=\"k\">" +
          escapeHtml(r[0]) +
          "</span><span class=\"v\">" +
          escapeHtml(r[1]) +
          "</span></div>"
      )
      .join("");
    const title = $("#setup-finish-title");
    const lead = $("#setup-finish-lead");
    if (title) title.textContent = "Ready to install";
    if (lead) {
      lead.textContent =
        "We’ll write live JSON into R2 and mark setup complete.";
    }
    const status = $("#setup-install-status");
    const done = $("#setup-done");
    const finish = $("#setup-finish-actions");
    const enter = $("#setup-enter-actions");
    const err = $("#setup-error");
    if (status) status.hidden = true;
    if (done) done.hidden = true;
    if (finish) finish.hidden = false;
    if (enter) enter.hidden = true;
    if (err) err.hidden = true;
  }

  function updateSetupChecks(status) {
    const map = {
      auth: true,
      r2: status && status.bindingOk,
      empty: status && status.needsSetup,
    };
    document.querySelectorAll("#setup-checks [data-check]").forEach((li) => {
      const key = li.getAttribute("data-check");
      li.classList.toggle("is-ok", Boolean(map[key]));
      li.classList.toggle("is-bad", map[key] === false);
    });
  }

  async function maybeStartSetup() {
    try {
      const status = await api("/api/setup");
      setupState.status = status;
      if (status.needsSetup) {
        showSetup();
        updateSetupChecks(status);
        return true;
      }
      return false;
    } catch (e) {
      toast(e.message || "Setup check failed", "error");
      return false;
    }
  }

  async function runInstall() {
    const payload = collectSetupPayload();
    const statusEl = $("#setup-install-status");
    const msg = $("#setup-install-msg");
    const finish = $("#setup-finish-actions");
    const enter = $("#setup-enter-actions");
    const done = $("#setup-done");
    const err = $("#setup-error");
    if (err) err.hidden = true;
    if (finish) finish.hidden = true;
    if (statusEl) statusEl.hidden = false;
    if (msg) msg.textContent = "Creating content in R2…";
    try {
      const res = await api("/api/setup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (msg) msg.textContent = "Installed " + (res.created || []).length + " files";
      if (statusEl) statusEl.hidden = true;
      if (done) done.hidden = false;
      if (enter) enter.hidden = false;
      const title = $("#setup-finish-title");
      if (title) title.textContent = "You're all set";
      toast("Setup complete", "ok");
    } catch (e) {
      if (statusEl) statusEl.hidden = true;
      if (finish) finish.hidden = false;
      if (err) {
        err.textContent = e.message || "Install failed";
        err.hidden = false;
      }
    }
  }

  async function skipSetup() {
    try {
      await api("/api/setup/skip", { method: "POST", body: "{}" });
    } catch (_) {}
    showApp();
    await refreshFiles();
  }

  async function enterAfterSetup() {
    showApp();
    await refreshFiles();
    if (state.files.some((f) => f.name === "site-settings.json")) {
      openFile("site-settings.json").catch(() => {});
    }
  }

  function bindSetupUi() {
    if (!$("#setup-view")) return;
    const next = (from, to) => {
      const btn = $("#setup-next-" + from);
      if (btn) btn.addEventListener("click", () => goSetupStep(to));
    };
    const back = (from, to) => {
      const btn = $("#setup-back-" + from);
      if (btn) btn.addEventListener("click", () => goSetupStep(to));
    };
    next(1, 2);
    next(2, 3);
    next(3, 4);
    next(4, 5);
    back(2, 1);
    back(3, 2);
    back(4, 3);
    back(5, 4);
    const skip = $("#setup-skip");
    if (skip) skip.addEventListener("click", () => skipSetup());
    const install = $("#setup-install");
    if (install) install.addEventListener("click", () => runInstall());
    const enter = $("#setup-enter");
    if (enter) enter.addEventListener("click", () => enterAfterSetup());
    const theme = $("#setup-theme");
    const themeLabel = $("#setup-theme-label");
    if (theme && themeLabel) {
      theme.addEventListener("input", () => {
        themeLabel.textContent = theme.value;
      });
    }
  }

  async function afterAuth() {
    const started = await maybeStartSetup();
    if (!started) {
      showApp();
      await refreshFiles();
    }
  }

  async function checkAuth() {
    try {
      const me = await api("/api/me");
      state.user = me.user;
      await afterAuth();
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
      const resolved = window.ContentTemplates
        ? ContentTemplates.resolve(res.name, res.data)
        : null;
      state.template = resolved;
      let data =
        resolved && resolved.fields && window.ContentTemplates
          ? ContentTemplates.applyDefaults(res.data, resolved)
          : res.data;
      if (state.template && data && !data._template) {
        data._template = state.template.id;
      }
      const draftData = await maybeOfferDraft(res.name, data);
      if (draftData) {
        data =
          resolved && resolved.fields && window.ContentTemplates
            ? ContentTemplates.applyDefaults(draftData, resolved)
            : draftData;
      }
      state.data = data;
      state.dirty = !!draftData;
      $("#editor-empty").hidden = true;
      $("#editor-panel").hidden = false;
      $("#current-file").textContent = prettyName(res.name);
      $("#public-url").textContent = "/content/" + res.name;
      $("#public-url").href = "/content/" + res.name;
      $("#save-bar").hidden = false;
      $("#save-bar-file").textContent = prettyName(res.name);
      state.snapshot = JSON.stringify(
        resolved && resolved.fields && window.ContentTemplates
          ? ContentTemplates.applyDefaults(res.data, resolved)
          : res.data
      );
      renderEditor();
      renderFileList();
      setDirty(!!draftData);
      setDraftStatus(draftData ? "Draft restored — save to publish" : "", draftData ? "warn" : "ok");
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
    if (dirty) scheduleAutosave();
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
        template: state.template,
        onChange: (next) => {
          state.data = next;
          setDirty(true);
          writeLocalDraft(state.currentName, next);
        },
        onStructure: (next) => {
          state.data = next;
          setDirty(true);
          writeLocalDraft(state.currentName, next);
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
      const res = await api(
        "/api/files/" + encodeURIComponent(state.currentName).replace(/%2F/g, "/"),
        {
          method: "PUT",
          body: JSON.stringify({ data: state.data }),
        }
      );
      state.snapshot = JSON.stringify(state.data);
      clearLocalDraft(state.currentName);
      setDirty(false);
      setDraftStatus(
        res.version ? "Published · history saved" : "Published",
        "ok"
      );
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
    if (!confirm("Discard unsaved changes and drafts?")) return;
    try {
      state.data = JSON.parse(state.snapshot || "{}");
      clearLocalDraft(state.currentName);
      try {
        await api("/api/drafts/" + encodeURIComponent(state.currentName), { method: "DELETE" });
      } catch (_) {}
      setDirty(false);
      setDraftStatus("");
      renderEditor();
      toast("Changes discarded", "ok");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function openHistory() {
    if (!state.currentName) return;
    const modal = $("#history-modal");
    const list = $("#history-list");
    list.innerHTML = '<p class="muted">Loading…</p>';
    modal.hidden = false;
    try {
      const res = await api("/api/versions/" + encodeURIComponent(state.currentName));
      const versions = res.versions || [];
      if (!versions.length) {
        list.innerHTML = '<p class="muted">No history yet. Save once to create a version.</p>';
        return;
      }
      list.innerHTML = "";
      versions.forEach((v) => {
        const row = document.createElement("div");
        row.className = "history-row";
        const when = v.savedAt ? new Date(v.savedAt).toLocaleString() : v.id;
        row.innerHTML =
          "<div><strong>" +
          escapeHtml(when) +
          '</strong><span class="muted"> · ' +
          escapeHtml(v.id) +
          "</span></div>";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-secondary btn-sm";
        btn.textContent = "Restore";
        btn.addEventListener("click", () => restoreVersion(v.id));
        row.appendChild(btn);
        list.appendChild(row);
      });
    } catch (e) {
      list.innerHTML = '<p class="error">' + escapeHtml(e.message) + "</p>";
    }
  }

  function closeHistory() {
    $("#history-modal").hidden = true;
  }

  async function restoreVersion(id) {
    if (!state.currentName) return;
    if (!confirm("Restore this version? Current content will be saved to history first.")) return;
    try {
      const res = await api(
        "/api/versions/" + encodeURIComponent(state.currentName) + "/restore",
        {
          method: "POST",
          body: JSON.stringify({ id }),
        }
      );
      let data = res.data;
      if (state.template && state.template.fields && window.ContentTemplates) {
        data = ContentTemplates.applyDefaults(data, state.template);
      }
      state.data = data;
      state.snapshot = JSON.stringify(data);
      clearLocalDraft(state.currentName);
      setDirty(false);
      setDraftStatus("Restored from history", "ok");
      renderEditor();
      closeHistory();
      toast("Restored version", "ok");
      await refreshFiles();
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function openTemplateModal() {
    if (!window.ContentTemplates) {
      toast("Templates failed to load", "error");
      return;
    }
    const modal = $("#tpl-modal");
    const list = $("#tpl-modal-list");
    list.innerHTML = "";
    state.pickTemplateId = "blog";
    ContentTemplates.list().forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tpl-card" + (t.id === state.pickTemplateId ? " active" : "");
      btn.innerHTML =
        "<strong>" +
        escapeHtml(t.label) +
        "</strong><span>" +
        escapeHtml(t.description || "") +
        "</span>" +
        (t.fields
          ? '<em class="tpl-tag">Locked fields</em>'
          : '<em class="tpl-tag is-free">Freeform</em>');
      btn.addEventListener("click", () => {
        state.pickTemplateId = t.id;
        list.querySelectorAll(".tpl-card").forEach((el) => el.classList.remove("active"));
        btn.classList.add("active");
        $("#tpl-file-name").value = t.defaultFile || t.id + ".json";
      });
      list.appendChild(btn);
    });
    const first = ContentTemplates.get(state.pickTemplateId);
    $("#tpl-file-name").value = (first && first.defaultFile) || "blog.json";
    modal.hidden = false;
  }

  function closeTemplateModal() {
    $("#tpl-modal").hidden = true;
  }

  async function createFile() {
    openTemplateModal();
  }

  async function createFromTemplate() {
    if (!window.ContentTemplates) return;
    let clean = ($("#tpl-file-name").value || "").trim().replace(/^\/+/, "");
    if (!clean) {
      toast("Enter a file name", "error");
      return;
    }
    if (!clean.toLowerCase().endsWith(".json")) clean += ".json";
    const data = ContentTemplates.createData(state.pickTemplateId);
    try {
      await api("/api/files", {
        method: "POST",
        body: JSON.stringify({ name: clean, data }),
      });
      closeTemplateModal();
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
      try {
        await afterAuth();
      } catch (listErr) {
        showApp();
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
  const tplClose = $("#tpl-modal-close");
  if (tplClose) tplClose.addEventListener("click", closeTemplateModal);
  const tplCreate = $("#tpl-modal-create");
  if (tplCreate) tplCreate.addEventListener("click", createFromTemplate);
  const tplModal = $("#tpl-modal");
  if (tplModal) {
    tplModal.addEventListener("click", (e) => {
      if (e.target === tplModal) closeTemplateModal();
    });
  }
  $("#btn-save").addEventListener("click", saveFile);
  const saveTop = $("#btn-save-top");
  if (saveTop) saveTop.addEventListener("click", saveFile);
  const discardBtn = $("#btn-discard");
  if (discardBtn) discardBtn.addEventListener("click", discardChanges);
  const historyBtn = $("#btn-history");
  if (historyBtn) historyBtn.addEventListener("click", openHistory);
  const historyClose = $("#history-close");
  if (historyClose) historyClose.addEventListener("click", closeHistory);
  const historyModal = $("#history-modal");
  if (historyModal) {
    historyModal.addEventListener("click", (e) => {
      if (e.target === historyModal) closeHistory();
    });
  }
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
  $("#raw-editor").addEventListener("input", () => {
    try {
      state.data = JSON.parse($("#raw-editor").value);
    } catch (_) {}
    setDirty(true);
  });

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
  bindSetupUi();
  checkAuth();
})();
