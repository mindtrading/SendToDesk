/**
 * Content form engine — clean CMS editing UI (JSON under the hood).
 */
(function (global) {
  const HTML_KEYS = /^(html|body|content|article|postBody|descriptionHtml|richText|markup)$/i;
  const LONG_KEYS = /^(description|excerpt|summary|bio|about|message|notes|caption|subtitle|lede|intro)$/i;
  const URL_KEYS = /^(url|href|link|src|image|imageUrl|logo|thumbnail|avatar|photo|photoUrl|cover|banner|icon|ogImage|downloadUrl|playStoreUrl|windowsUrl|canonical|website)$/i;
  const IMAGE_URL_KEYS = /(image|logo|thumb|avatar|photo|cover|banner|icon|ogImage|^src$)/i;
  const EMAIL_KEYS = /^(email|supportEmail|contactEmail|mail)$/i;
  const DATE_KEYS = /^(date|publishedAt|updatedAt|createdAt|startDate|endDate)$/i;
  const COLOR_KEYS = /^(color|bg|background|themeColor|accent)$/i;
  const TITLE_KEYS = /^(title|name|label|heading|headline)$/i;
  const META_KEYS = /^(id|slug|key|uid)$/i;

  const expandedCards = new Set();
  let activeEditors = [];

  function destroyRichEditors() {
    activeEditors.forEach((item) => {
      try {
        (item.editor || item).destroy();
      } catch (_) {}
    });
    activeEditors = [];
  }

  function flushRichEditors() {
    activeEditors.forEach((item) => {
      try {
        const editor = item.editor || item;
        const onInput = item.onInput;
        if (editor && typeof editor.getContents === "function" && onInput) {
          onInput(editor.getContents());
        }
      } catch (_) {}
    });
  }

  function sunEditorOptions(onInput) {
    return {
      height: "280px",
      minHeight: "200px",
      width: "100%",
      placeholder: "Write your content here…",
      resizingBar: true,
      buttonList: [
        ["undo", "redo"],
        ["fontSize", "formatBlock"],
        ["bold", "underline", "italic", "strike", "removeFormat"],
        ["fontColor", "hiliteColor"],
        ["align", "list", "indent", "outdent"],
        ["link", "image", "video", "table"],
        ["blockquote", "horizontalRule"],
        ["codeView", "fullScreen", "preview"],
      ],
      formats: ["p", "blockquote", "h1", "h2", "h3", "h4"],
      fontSize: [12, 14, 16, 18, 20, 24, 32],
      imageAccept: ".jpg, .jpeg, .png, .gif, .webp",
      imageUploadUrl: "/api/upload",
      imageUploadSizeLimit: 5 * 1024 * 1024,
      imageUrlInput: true,
      imageMultipleFile: false,
      linkTargetNewWindow: true,
      stickyToolbar: "transparent",
      callBackSave: function (contents) {
        if (typeof onInput === "function") onInput(contents);
      },
      onChange: function (contents) {
        if (typeof onInput === "function") onInput(contents);
      },
      onImageUploadError: function (errorMessage) {
        alert(errorMessage || "Image upload failed");
        return false;
      },
    };
  }

  function mountRichEditors(root) {
    if (!root || !window.SUNEDITOR) return;
    root.querySelectorAll("textarea.sun-target").forEach((ta) => {
      if (ta.getAttribute("data-sun-ready") === "1") return;
      ta.setAttribute("data-sun-ready", "1");
      const onInput = ta._csOnInput;
      try {
        const editor = window.SUNEDITOR.create(ta, sunEditorOptions(onInput));
        if (ta.value) editor.setContents(ta.value);
        activeEditors.push({ editor, onInput });
      } catch (err) {
        console.warn("SunEditor init failed", err);
        ta.classList.add("input", "textarea", "html-editor");
        ta.addEventListener("input", () => onInput && onInput(ta.value));
      }
    });
  }

  function labelFromKey(key) {
    return String(key)
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function typeOf(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  function looksLikeHtml(s) {
    return typeof s === "string" && /<\/?[a-z][\s\S]*>/i.test(s);
  }

  function fieldKind(key, value) {
    const k = String(key || "");
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeOf(value) === "object") return "object";
    if (typeof value !== "string") return "string";
    if (HTML_KEYS.test(k) || looksLikeHtml(value)) return "html";
    if (EMAIL_KEYS.test(k)) return "email";
    if (URL_KEYS.test(k)) return "url";
    if (DATE_KEYS.test(k) && /^\d{4}-\d{2}-\d{2}/.test(value)) return "date";
    if (COLOR_KEYS.test(k) && /^#?[0-9a-fA-F]{3,8}$/.test(value)) return "color";
    if (LONG_KEYS.test(k) || value.length > 100 || value.includes("\n")) return "textarea";
    return "text";
  }

  function emptyForKind(kind) {
    switch (kind) {
      case "number":
        return 0;
      case "boolean":
        return false;
      case "null":
        return null;
      case "array":
        return [];
      case "object":
        return {};
      case "html":
        return "<p></p>";
      default:
        return "";
    }
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function pathKey(path) {
    return path.join(".");
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === false || v == null) return;
        if (k === "className") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === "checked") node.checked = !!v;
        else node.setAttribute(k, v === true ? "" : String(v));
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function setAtPath(root, path, nextValue) {
    if (path.length === 0) return nextValue;
    const out = clone(root);
    let cur = out;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = nextValue;
    return out;
  }

  function itemTitle(item, index) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const k of Object.keys(item)) {
        if (TITLE_KEYS.test(k) && item[k]) return String(item[k]);
      }
      if (item.slug) return String(item.slug);
      if (item.id) return String(item.id);
    }
    if (typeof item === "string" && item) return item.slice(0, 60);
    return "Item " + (index + 1);
  }

  function itemStatus(item) {
    if (!item || typeof item !== "object") return null;
    if (typeof item.published === "boolean") return item.published ? "Published" : "Draft";
    if (typeof item.active === "boolean") return item.active ? "Active" : "Inactive";
    if (typeof item.enabled === "boolean") return item.enabled ? "On" : "Off";
    return null;
  }

  function htmlEditor(value, onInput) {
    const wrap = el("div", { className: "html-editor-wrap sun-wrap" });
    const ta = el("textarea", {
      className: "sun-target",
      rows: "10",
    });
    ta.value = value || "";
    ta._csOnInput = onInput;
    wrap.appendChild(ta);

    if (!window.SUNEDITOR) {
      ta.className = "input textarea html-editor";
      ta.placeholder = "Write your content here (HTML supported)…";
      ta.addEventListener("input", () => onInput(ta.value));
    }

    return wrap;
  }

  function isImageUrlField(key, forcedKind) {
    if (forcedKind === "url" && IMAGE_URL_KEYS.test(String(key))) return true;
    return IMAGE_URL_KEYS.test(String(key));
  }

  async function uploadImageFile(file) {
    const fd = new FormData();
    fd.append("file", file, file.name || "image.jpg");
    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    let body = null;
    try {
      body = await res.json();
    } catch (_) {}
    if (!res.ok) {
      throw new Error((body && (body.errorMessage || body.error)) || "Upload failed");
    }
    const first = body && body.result && body.result[0];
    if (!first || !first.url) throw new Error("Upload returned no URL");
    return first.url;
  }

  function imageUrlControl(key, value, path, api) {
    const input = el("input", {
      className: "input",
      type: "url",
      placeholder: "https:// or upload below",
      onInput: (e) => {
        api.change(path, e.target.value);
        syncPreview(e.target.value);
      },
    });
    input.value = value || "";

    const preview = el("img", {
      className: "url-upload-preview",
      alt: "",
    });
    const previewWrap = el("div", { className: "url-upload-preview-wrap", hidden: true }, [preview]);

    function syncPreview(url) {
      const u = String(url || "").trim();
      if (u && /^https?:\/\//i.test(u)) {
        preview.src = u;
        previewWrap.hidden = false;
      } else {
        preview.removeAttribute("src");
        previewWrap.hidden = true;
      }
    }
    syncPreview(value);

    const fileInput = el("input", {
      type: "file",
      accept: "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp",
      className: "url-upload-file",
      hidden: true,
    });

    const status = el("span", { className: "url-upload-status muted", text: "" });
    const btn = el("button", {
      type: "button",
      className: "btn btn-secondary btn-sm",
      text: "Upload image",
      onClick: () => fileInput.click(),
    });

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      btn.disabled = true;
      status.textContent = "Uploading…";
      try {
        const url = await uploadImageFile(file);
        input.value = url;
        api.change(path, url);
        syncPreview(url);
        status.textContent = "Uploaded to R2 · media/";
      } catch (e) {
        status.textContent = e.message || "Upload failed";
      } finally {
        btn.disabled = false;
      }
    });

    const actions = el("div", { className: "url-upload-actions" }, [btn, status, fileInput]);
    const wrap = el("div", { className: "url-upload" }, [input, actions, previewWrap]);
    return wrap;
  }

  function fieldControl(key, value, path, api, forcedKind) {
    const kind = forcedKind || fieldKind(key, value);

    if (kind === "url" && isImageUrlField(key, forcedKind)) {
      return { kind, control: imageUrlControl(key, value, path, api), wide: true };
    }

    if (kind === "text" || kind === "email" || kind === "url" || kind === "date") {
      const input = el("input", {
        className: "input",
        type: kind === "text" ? "text" : kind,
        placeholder:
          kind === "url" ? "https://" : kind === "email" ? "name@email.com" : kind === "date" ? "YYYY-MM-DD" : labelFromKey(key),
        onInput: (e) => api.change(path, e.target.value),
      });
      input.value = value || "";
      return { kind, control: input };
    }

    if (kind === "color") {
      const colorVal = value && String(value).startsWith("#") ? value : "#" + String(value || "000000").replace(/^#/, "");
      const text = el("input", {
        className: "input",
        type: "text",
        onInput: (e) => api.change(path, e.target.value),
      });
      text.value = value || "";
      const picker = el("input", {
        className: "color-picker",
        type: "color",
        value: /^#[0-9a-fA-F]{6}$/.test(colorVal) ? colorVal : "#1d4ed8",
        onInput: (e) => {
          text.value = e.target.value;
          api.change(path, e.target.value);
        },
      });
      return { kind, control: el("div", { className: "color-row" }, [picker, text]) };
    }

    if (kind === "textarea") {
      const ta = el("textarea", {
        className: "input textarea",
        rows: "4",
        placeholder: labelFromKey(key),
        onInput: (e) => api.change(path, e.target.value),
      });
      ta.value = value || "";
      return { kind, control: ta };
    }

    if (kind === "html") {
      return { kind, control: htmlEditor(value, (v) => api.change(path, v)), wide: true };
    }

    if (kind === "number") {
      const input = el("input", {
        className: "input",
        type: "number",
        step: "any",
        onInput: (e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          api.change(path, Number.isFinite(n) ? n : 0);
        },
      });
      input.value = String(value);
      return { kind, control: input };
    }

    if (kind === "boolean") {
      const text = el("span", { className: "toggle-text", text: value ? "On" : "Off" });
      const input = el("input", {
        type: "checkbox",
        checked: !!value,
        onChange: (e) => {
          text.textContent = e.target.checked ? "On" : "Off";
          api.change(path, e.target.checked);
        },
      });
      return {
        kind,
        control: el("label", { className: "toggle" }, [input, el("span", { className: "toggle-ui" }), text]),
      };
    }

    if (kind === "null") {
      return {
        kind,
        control: el("div", { className: "null-row" }, [
          el("span", { className: "muted", text: "Empty" }),
          el(
            "select",
            {
              className: "input select-sm",
              onChange: (e) => {
                const nt = e.target.value;
                if (!nt) return;
                api.structure(path, emptyForKind(nt));
              },
            },
            [
              el("option", { value: "", text: "Set type…" }),
              el("option", { value: "text", text: "Text" }),
              el("option", { value: "html", text: "HTML" }),
              el("option", { value: "number", text: "Number" }),
              el("option", { value: "boolean", text: "Toggle" }),
            ]
          ),
        ]),
      };
    }

    return null;
  }

  function primitiveField(key, value, path, api, opts) {
    const options = opts || {};
    const built = fieldControl(key, value, path, api, options.forcedKind);
    if (!built) return null;
    const isMeta = META_KEYS.test(String(key));
    const node = el("div", {
      className:
        "c-field" +
        (built.wide ? " c-field-wide" : "") +
        (built.kind === "boolean" ? " c-field-bool" : "") +
        (isMeta ? " c-field-meta" : ""),
    }, [
      el("label", { className: "c-label", text: options.label || labelFromKey(key) }),
      built.control,
    ]);
    if (options.showRemove) {
      node.appendChild(
        el("button", {
          type: "button",
          className: "c-field-x",
          text: "×",
          title: "Remove field",
          onClick: options.showRemove,
        })
      );
    }
    return node;
  }

  function sortObjectKeys(keys, obj) {
    const rank = (k) => {
      if (TITLE_KEYS.test(k)) return 0;
      if (k === "slug") return 1;
      if (DATE_KEYS.test(k)) return 2;
      if (/published|active|enabled/i.test(k)) return 3;
      if (LONG_KEYS.test(k)) return 4;
      if (HTML_KEYS.test(k) || looksLikeHtml(obj[k])) return 6;
      if (META_KEYS.test(k)) return 7;
      return 5;
    };
    return keys.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }

  function buildObjectFields(value, path, api, opts) {
    const options = opts || {};
    const keys = sortObjectKeys(Object.keys(value), value);
    const grid = el("div", { className: "c-grid" });

    keys.forEach((k) => {
      const v = value[k];
      const kind = fieldKind(k, v);
      if (kind === "object" || kind === "array") {
        const nested = buildNode(v, path.concat(k), api, k, {
          depth: (options.depth || 0) + 1,
          allowFieldRemove: options.allowFieldRemove,
        });
        nested.classList.add("c-field-wide");
        grid.appendChild(nested);
        return;
      }
      const field = primitiveField(k, v, path.concat(k), api, {
        showRemove: options.allowFieldRemove
          ? () => {
              const next = clone(value);
              delete next[k];
              api.structure(path, next);
            }
          : null,
      });
      if (field) grid.appendChild(field);
    });

    return grid;
  }

  function addFieldBar(value, path, api) {
    const details = el("details", { className: "c-add-details" });
    details.appendChild(el("summary", { text: "Add field" }));
    const row = el("div", { className: "c-add-row" }, [
      el("input", { className: "input", placeholder: "Field name", "data-role": "new-key" }),
      el(
        "select",
        { className: "input select-sm", "data-role": "new-type" },
        [
          el("option", { value: "text", text: "Text" }),
          el("option", { value: "html", text: "HTML" }),
          el("option", { value: "textarea", text: "Long text" }),
          el("option", { value: "number", text: "Number" }),
          el("option", { value: "boolean", text: "Toggle" }),
          el("option", { value: "url", text: "Link" }),
          el("option", { value: "object", text: "Group" }),
          el("option", { value: "array", text: "List" }),
        ]
      ),
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-sm",
        text: "Add",
        onClick: (e) => {
          const box = e.currentTarget.parentElement;
          const nk = box.querySelector('[data-role="new-key"]').value.trim();
          const nt = box.querySelector('[data-role="new-type"]').value;
          if (!nk) return;
          if (Object.prototype.hasOwnProperty.call(value, nk)) {
            alert("That field already exists");
            return;
          }
          const next = clone(value);
          next[nk] = emptyForKind(nt);
          api.structure(path, next);
        },
      }),
    ]);
    details.appendChild(row);
    return details;
  }

  function buildNode(value, path, api, keyName, opts) {
    const options = opts || {};
    const key = keyName == null ? "Content" : keyName;
    const kind = fieldKind(key, value);
    const depth = options.depth || 0;

    if (kind !== "object" && kind !== "array") {
      return primitiveField(key, value, path, api, {}) || el("div", { className: "muted", text: "Unsupported" });
    }

    if (kind === "object") {
      const isRoot = path.length === 0;
      const isArrayChild = typeof path[path.length - 1] === "number";
      const body = buildObjectFields(value, path, api, {
        depth,
        allowFieldRemove: !isArrayChild && depth < 2,
      });

      if (isRoot || isArrayChild) {
        const wrap = el("div", { className: isRoot ? "c-root" : "c-flat" }, [body]);
        if (!isArrayChild) wrap.appendChild(addFieldBar(value, path, api));
        return wrap;
      }

      return el("div", { className: "c-group" }, [
        el("div", { className: "c-group-head" }, [
          el("h3", { className: "c-group-title", text: labelFromKey(key) }),
        ]),
        body,
        depth < 2 ? addFieldBar(value, path, api) : null,
      ]);
    }

    // array
    const list = el("div", { className: "c-list" });
    const sample =
      value.length > 0
        ? value[0]
        : { title: "New item", slug: "", date: new Date().toISOString().slice(0, 10), published: false, body: "<p></p>" };

    const isObjectList = value.length === 0 || typeOf(value[0]) === "object";

    value.forEach((item, index) => {
      const cardPath = path.concat(index);
      const keyId = pathKey(cardPath);
      const open = expandedCards.has(keyId) || (value.length <= 2 && index === 0);

      if (!isObjectList) {
        const row = el("div", { className: "c-chip-row" }, [
          primitiveField(String(index + 1), item, cardPath, api, {}),
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny",
            text: "Remove",
            onClick: () => {
              const next = value.slice();
              next.splice(index, 1);
              api.structure(path, next);
            },
          }),
        ]);
        list.appendChild(row);
        return;
      }

      const status = itemStatus(item);
      const card = el("article", { className: "c-card" + (open ? " is-open" : "") });
      const chevron = el("span", { className: "c-card-chevron", text: open ? "▾" : "▸" });
      let bodyEl = null;

      function ensureBody() {
        if (bodyEl) return bodyEl;
        bodyEl = el("div", { className: "c-card-body" });
        bodyEl.appendChild(buildNode(item, cardPath, api, String(index), { depth: depth + 1 }));
        card.appendChild(bodyEl);
        mountRichEditors(bodyEl);
        return bodyEl;
      }

      function setOpen(nextOpen) {
        if (nextOpen) {
          expandedCards.add(keyId);
          card.classList.add("is-open");
          chevron.textContent = "▾";
          ensureBody();
          bodyEl.hidden = false;
        } else {
          expandedCards.delete(keyId);
          card.classList.remove("is-open");
          chevron.textContent = "▸";
          if (bodyEl) bodyEl.hidden = true;
        }
      }

      const head = el("div", { className: "c-card-head" }, [
        el("button", {
          type: "button",
          className: "c-card-toggle",
          onClick: () => setOpen(!expandedCards.has(keyId)),
        }, [
          chevron,
          el("span", { className: "c-card-title", text: itemTitle(item, index) }),
          status
            ? el("span", {
                className: "c-status " + (/Draft|Inactive|Off/i.test(status) ? "is-draft" : "is-live"),
                text: status,
              })
            : null,
          el("span", { className: "c-card-num", text: "#" + (index + 1) }),
        ]),
        el("div", { className: "c-card-actions" }, [
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny",
            text: "Up",
            disabled: index === 0,
            onClick: () => {
              if (index === 0) return;
              const next = value.slice();
              const t = next[index - 1];
              next[index - 1] = next[index];
              next[index] = t;
              api.structure(path, next);
            },
          }),
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny",
            text: "Down",
            disabled: index === value.length - 1,
            onClick: () => {
              if (index >= value.length - 1) return;
              const next = value.slice();
              const t = next[index + 1];
              next[index + 1] = next[index];
              next[index] = t;
              api.structure(path, next);
            },
          }),
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny",
            text: "Copy",
            onClick: () => {
              const next = value.slice();
              const copy = clone(item);
              if (copy && typeof copy === "object") {
                if (copy.title) copy.title = copy.title + " (copy)";
                if (copy.id) copy.id = String(copy.id) + "-copy";
                if (copy.slug) copy.slug = String(copy.slug) + "-copy";
                copy.published = false;
              }
              next.splice(index + 1, 0, copy);
              expandedCards.add(pathKey(path.concat(index + 1)));
              api.structure(path, next);
            },
          }),
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny c-danger",
            text: "Delete",
            onClick: async () => {
              const ask = window.CSConfirm || ((o) => Promise.resolve(window.confirm(o.message || o.title)));
              const ok = await ask({
                title: "Delete item?",
                message: "Remove this item from the list.",
                confirmText: "Delete",
                danger: true,
                icon: "⌫",
              });
              if (!ok) return;
              const next = value.slice();
              next.splice(index, 1);
              expandedCards.delete(keyId);
              api.structure(path, next);
            },
          }),
        ]),
      ]);

      card.appendChild(head);
      if (open) {
        ensureBody();
        bodyEl.hidden = false;
      }
      list.appendChild(card);
    });

    const singular = labelFromKey(key).replace(/s$/i, "") || "Item";

    return el("section", { className: "c-collection" }, [
      el("div", { className: "c-collection-head" }, [
        el("div", { className: "c-collection-titles" }, [
          el("h2", { className: "c-collection-title", text: labelFromKey(key) }),
          el("span", { className: "c-collection-count", text: value.length + (value.length === 1 ? " item" : " items") }),
        ]),
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-sm",
          text: "+ Add " + singular.toLowerCase(),
          onClick: () => {
            const next = value.slice();
            const neu = clone(sample);
            if (neu && typeof neu === "object") {
              if ("title" in neu) neu.title = "New " + singular.toLowerCase();
              if ("name" in neu) neu.name = "New " + singular.toLowerCase();
              if ("published" in neu) neu.published = false;
              if ("active" in neu) neu.active = false;
              if ("id" in neu) neu.id = "item-" + Date.now().toString(36);
              if ("slug" in neu) neu.slug = "new-item";
            }
            next.push(neu);
            expandedCards.add(pathKey(path.concat(next.length - 1)));
            api.structure(path, next);
          },
        }),
      ]),
      list,
    ]);
  }

  function render(container, data, hooks) {
    const onChange = typeof hooks === "function" ? hooks : hooks.onChange;
    const onStructure =
      typeof hooks === "function" ? hooks : hooks.onStructure || hooks.onChange;

    let current = data;
    const api = {
      change(path, nextValue) {
        current = setAtPath(current, path, nextValue);
        onChange(current);
      },
      structure(path, nextValue) {
        current = setAtPath(current, path, nextValue);
        onStructure(current);
      },
    };

    destroyRichEditors();
    container.innerHTML = "";

    const template = hooks && hooks.template;
    const locked = !!(template && template.fields && template.locked !== false);

    if (locked) {
      const banner = el("div", { className: "tpl-banner" }, [
        el("div", { className: "tpl-banner-text" }, [
          el("strong", { text: template.label + " template" }),
          el("span", {
            className: "muted",
            text: " — Fixed fields. You can edit content, not the structure.",
          }),
        ]),
        el("span", { className: "tpl-lock", text: "Locked" }),
      ]);
      container.appendChild(banner);
      container.appendChild(buildSchemaRoot(template.fields, current, api));
    } else {
      if (template && template.id === "custom") {
        container.appendChild(
          el("div", { className: "tpl-banner is-free" }, [
            el("div", { className: "tpl-banner-text" }, [
              el("strong", { text: "Custom / freeform" }),
              el("span", {
                className: "muted",
                text: " — Structure can be changed (advanced).",
              }),
            ]),
          ])
        );
      }
      container.appendChild(buildNode(current, [], api, "root", { depth: 0 }));
    }

    mountRichEditors(container);
  }

  function buildSchemaRoot(fields, value, api) {
    const wrap = el("div", { className: "c-root" });
    wrap.appendChild(buildSchemaFields(fields, value || {}, [], api));
    return wrap;
  }

  function buildSchemaFields(fields, value, path, api) {
    const grid = el("div", { className: "c-grid" });
    (fields || []).forEach((f) => {
      if (f.key === "_template") return;
      const v = value && value[f.key] !== undefined ? value[f.key] : null;
      const childPath = path.concat(f.key);

      if (f.type === "object") {
        const group = el("div", { className: "c-group c-field-wide" }, [
          el("div", { className: "c-group-head" }, [
            el("h3", { className: "c-group-title", text: f.label || labelFromKey(f.key) }),
          ]),
          buildSchemaFields(f.fields || [], v && typeof v === "object" ? v : {}, childPath, api),
        ]);
        grid.appendChild(group);
        return;
      }

      if (f.type === "array") {
        grid.appendChild(buildSchemaArray(f, Array.isArray(v) ? v : [], childPath, api));
        return;
      }

      let seed = v;
      if (seed == null) {
        if (f.type === "boolean") seed = false;
        else if (f.type === "number") seed = 0;
        else if (f.type === "html") seed = "<p></p>";
        else seed = "";
      }
      const field = primitiveField(f.key, seed, childPath, api, {
        label: f.label,
        forcedKind: f.type,
      });
      if (field) grid.appendChild(field);
    });
    return grid;
  }

  function buildSchemaArray(fieldDef, value, path, api) {
    const list = el("div", { className: "c-list" });
    const sample = fieldDef.itemDefault
      ? clone(fieldDef.itemDefault)
      : { title: "New item" };
    const itemLabel = fieldDef.itemLabel || "Item";

    value.forEach((item, index) => {
      const cardPath = path.concat(index);
      const keyId = pathKey(cardPath);
      const open = expandedCards.has(keyId) || (value.length <= 2 && index === 0);
      const status = itemStatus(item);
      const card = el("article", { className: "c-card" + (open ? " is-open" : "") });
      const chevron = el("span", { className: "c-card-chevron", text: open ? "▾" : "▸" });
      let bodyEl = null;

      function ensureBody() {
        if (bodyEl) return bodyEl;
        bodyEl = el("div", { className: "c-card-body" });
        const flat = el("div", { className: "c-flat" });
        flat.appendChild(
          buildSchemaFields(
            fieldDef.itemFields || [],
            item && typeof item === "object" ? item : {},
            cardPath,
            api
          )
        );
        bodyEl.appendChild(flat);
        card.appendChild(bodyEl);
        mountRichEditors(bodyEl);
        return bodyEl;
      }

      function setOpen(nextOpen) {
        if (nextOpen) {
          expandedCards.add(keyId);
          card.classList.add("is-open");
          chevron.textContent = "▾";
          ensureBody();
          bodyEl.hidden = false;
        } else {
          expandedCards.delete(keyId);
          card.classList.remove("is-open");
          chevron.textContent = "▸";
          if (bodyEl) bodyEl.hidden = true;
        }
      }

      card.appendChild(
        el("div", { className: "c-card-head" }, [
          el("button", {
            type: "button",
            className: "c-card-toggle",
            onClick: () => setOpen(!expandedCards.has(keyId)),
          }, [
            chevron,
            el("span", { className: "c-card-title", text: itemTitle(item, index) }),
            status
              ? el("span", {
                  className: "c-status " + (/Draft|Inactive|Off/i.test(status) ? "is-draft" : "is-live"),
                  text: status,
                })
              : null,
            el("span", { className: "c-card-num", text: "#" + (index + 1) }),
          ]),
          el("div", { className: "c-card-actions" }, [
            el("button", {
              type: "button",
              className: "btn btn-ghost btn-tiny",
              text: "Up",
              disabled: index === 0,
              onClick: () => {
                if (index === 0) return;
                const next = value.slice();
                const t = next[index - 1];
                next[index - 1] = next[index];
                next[index] = t;
                api.structure(path, next);
              },
            }),
            el("button", {
              type: "button",
              className: "btn btn-ghost btn-tiny",
              text: "Down",
              disabled: index === value.length - 1,
              onClick: () => {
                if (index >= value.length - 1) return;
                const next = value.slice();
                const t = next[index + 1];
                next[index + 1] = next[index];
                next[index] = t;
                api.structure(path, next);
              },
            }),
            el("button", {
              type: "button",
              className: "btn btn-ghost btn-tiny",
              text: "Copy",
              onClick: () => {
                const next = value.slice();
                const copy = clone(item);
                if (copy && typeof copy === "object") {
                  if (copy.title) copy.title = copy.title + " (copy)";
                  if (copy.id) copy.id = String(copy.id) + "-copy";
                  if (copy.slug) copy.slug = String(copy.slug) + "-copy";
                  if ("published" in copy) copy.published = false;
                }
                next.splice(index + 1, 0, copy);
                expandedCards.add(pathKey(path.concat(index + 1)));
                api.structure(path, next);
              },
            }),
            el("button", {
              type: "button",
              className: "btn btn-ghost btn-tiny c-danger",
              text: "Delete",
              onClick: async () => {
                const ask = window.CSConfirm || ((o) => Promise.resolve(window.confirm(o.message || o.title)));
                const ok = await ask({
                  title: "Delete " + itemLabel.toLowerCase() + "?",
                  message: "Remove this " + itemLabel.toLowerCase() + " from the list.",
                  confirmText: "Delete",
                  danger: true,
                  icon: "⌫",
                });
                if (!ok) return;
                const next = value.slice();
                next.splice(index, 1);
                expandedCards.delete(keyId);
                api.structure(path, next);
              },
            }),
          ]),
        ])
      );

      if (open) {
        ensureBody();
        bodyEl.hidden = false;
      }
      list.appendChild(card);
    });

    return el("section", { className: "c-collection c-field-wide" }, [
      el("div", { className: "c-collection-head" }, [
        el("div", { className: "c-collection-titles" }, [
          el("h2", { className: "c-collection-title", text: fieldDef.label || labelFromKey(fieldDef.key) }),
          el("span", {
            className: "c-collection-count",
            text: value.length + (value.length === 1 ? " item" : " items"),
          }),
        ]),
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-sm",
          text: "+ Add " + itemLabel.toLowerCase(),
          onClick: () => {
            const next = value.slice();
            const neu = clone(sample);
            if (neu && typeof neu === "object") {
              if ("id" in neu) neu.id = "item-" + Date.now().toString(36);
              if ("slug" in neu) neu.slug = "new-item";
              if ("published" in neu) neu.published = false;
            }
            next.push(neu);
            expandedCards.add(pathKey(path.concat(next.length - 1)));
            api.structure(path, next);
          },
        }),
      ]),
      list,
    ]);
  }

  global.FormEngine = {
    render,
    clone,
    typeOf,
    labelFromKey,
    fieldKind,
    destroyRichEditors,
    flushRichEditors,
  };
})(window);
