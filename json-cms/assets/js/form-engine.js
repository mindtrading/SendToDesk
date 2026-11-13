/**
 * Content form engine — JSON under the hood, CMS-style fields on screen.
 */
(function (global) {
  const HTML_KEYS = /^(html|body|content|article|postBody|descriptionHtml|richText|markup)$/i;
  const LONG_KEYS = /^(description|excerpt|summary|bio|about|message|notes|caption|subtitle|lede|intro)$/i;
  const URL_KEYS = /^(url|href|link|src|image|imageUrl|logo|thumbnail|avatar|downloadUrl|playStoreUrl|windowsUrl|canonical|website)$/i;
  const EMAIL_KEYS = /^(email|supportEmail|contactEmail|mail)$/i;
  const DATE_KEYS = /^(date|publishedAt|updatedAt|createdAt|startDate|endDate)$/i;
  const COLOR_KEYS = /^(color|bg|background|themeColor|accent)$/i;
  const TITLE_KEYS = /^(title|name|label|heading|headline)$/i;

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

  function kindLabel(kind) {
    const map = {
      html: "HTML",
      textarea: "Long text",
      text: "Text",
      url: "Link",
      email: "Email",
      date: "Date",
      color: "Color",
      number: "Number",
      boolean: "Toggle",
      null: "Empty",
      object: "Section",
      array: "List",
    };
    return map[kind] || kind;
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

  function emptyForType(t) {
    return emptyForKind(t === "string" ? "text" : t);
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === false || v == null) return;
        if (k === "className") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
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

  function fieldWrap(key, kind, control, extra) {
    return el("div", { className: "field field-" + kind }, [
      el("div", { className: "field-head" }, [
        el("label", { className: "field-label", text: labelFromKey(key) }),
        el("span", { className: "type-badge soft", text: kindLabel(kind) }),
      ]),
      control,
      extra || null,
    ]);
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
      if (item.id) return String(item.id);
      if (item.slug) return String(item.slug);
    }
    if (typeof item === "string" && item) return item.slice(0, 48);
    return "Item " + (index + 1);
  }

  function wrapHtmlTag(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.slice(start, end) || "text";
    const next = val.slice(0, start) + before + selected + after + val.slice(end);
    textarea.value = next;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    const pos = start + before.length + selected.length + after.length;
    textarea.setSelectionRange(pos, pos);
  }

  function htmlEditor(value, onInput) {
    const ta = el("textarea", {
      className: "input textarea html-editor",
      rows: "12",
      spellcheck: "true",
      placeholder: "Write HTML content here…",
      onInput: (e) => onInput(e.target.value),
    });
    ta.value = value || "";

    const preview = el("div", { className: "html-preview", hidden: true });
    const frame = el("iframe", {
      className: "html-preview-frame",
      sandbox: "",
      title: "Preview",
    });
    preview.appendChild(frame);

    const toolbar = el("div", { className: "html-toolbar" }, [
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "B",
        title: "Bold",
        onClick: () => wrapHtmlTag(ta, "<strong>", "</strong>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "I",
        title: "Italic",
        onClick: () => wrapHtmlTag(ta, "<em>", "</em>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "P",
        title: "Paragraph",
        onClick: () => wrapHtmlTag(ta, "<p>", "</p>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "H2",
        title: "Heading",
        onClick: () => wrapHtmlTag(ta, "<h2>", "</h2>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "Link",
        title: "Link",
        onClick: () => wrapHtmlTag(ta, '<a href="">', "</a>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-ghost btn-tiny",
        text: "List",
        title: "List",
        onClick: () => wrapHtmlTag(ta, "<ul>\n  <li>", "</li>\n</ul>"),
      }),
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-tiny",
        text: "Preview",
        onClick: () => {
          const show = preview.hidden;
          preview.hidden = !show;
          if (show) {
            frame.srcdoc =
              "<!doctype html><html><head><style>body{font-family:system-ui,sans-serif;line-height:1.55;padding:12px;color:#111}</style></head><body>" +
              ta.value +
              "</body></html>";
          }
        },
      }),
    ]);

    return el("div", { className: "html-editor-wrap" }, [toolbar, ta, preview]);
  }

  function buildNode(value, path, api, keyName) {
    const key = keyName == null ? "Content" : keyName;
    const kind = fieldKind(key, value);

    if (kind === "text" || kind === "email" || kind === "url" || kind === "date") {
      const input = el("input", {
        className: "input",
        type: kind === "text" ? "text" : kind,
        placeholder: kind === "url" ? "https://" : kind === "email" ? "name@email.com" : "",
        onInput: (e) => api.change(path, e.target.value),
      });
      input.value = value || "";
      return fieldWrap(key, kind, input);
    }

    if (kind === "color") {
      const colorVal = value && value.startsWith("#") ? value : "#" + String(value || "000000").replace(/^#/, "");
      const text = el("input", {
        className: "input",
        type: "text",
        onInput: (e) => api.change(path, e.target.value),
      });
      text.value = value || "";
      const picker = el("input", {
        className: "color-picker",
        type: "color",
        value: /^#[0-9a-fA-F]{6}$/.test(colorVal) ? colorVal : "#000000",
        onInput: (e) => {
          text.value = e.target.value;
          api.change(path, e.target.value);
        },
      });
      return fieldWrap(key, kind, el("div", { className: "color-row" }, [picker, text]));
    }

    if (kind === "textarea") {
      const ta = el("textarea", {
        className: "input textarea",
        rows: "5",
        onInput: (e) => api.change(path, e.target.value),
      });
      ta.value = value || "";
      return fieldWrap(key, kind, ta);
    }

    if (kind === "html") {
      return fieldWrap(
        key,
        kind,
        htmlEditor(value, (v) => api.change(path, v)),
        el("p", { className: "field-hint", text: "HTML for blog/pages. Use Preview to check." })
      );
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
      return fieldWrap(key, kind, input);
    }

    if (kind === "boolean") {
      const text = el("span", {
        className: "toggle-text",
        text: value ? "On" : "Off",
      });
      const input = el("input", {
        type: "checkbox",
        checked: !!value,
        onChange: (e) => {
          text.textContent = e.target.checked ? "On" : "Off";
          api.change(path, e.target.checked);
        },
      });
      return fieldWrap(
        key,
        kind,
        el("label", { className: "toggle" }, [input, el("span", { className: "toggle-ui" }), text])
      );
    }

    if (kind === "null") {
      return fieldWrap(
        key,
        kind,
        el("div", { className: "null-row" }, [
          el("span", { className: "muted", text: "No value yet" }),
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
              el("option", { value: "", text: "Choose field type…" }),
              el("option", { value: "text", text: "Text" }),
              el("option", { value: "html", text: "HTML" }),
              el("option", { value: "number", text: "Number" }),
              el("option", { value: "boolean", text: "Toggle" }),
              el("option", { value: "object", text: "Section" }),
              el("option", { value: "array", text: "List" }),
            ]
          ),
        ])
      );
    }

    if (kind === "object") {
      const keys = Object.keys(value);
      const body = el("div", { className: "object-body" });
      keys.forEach((k) => {
        const child = buildNode(value[k], path.concat(k), api, k);
        child.classList.add("nested-field");
        child.appendChild(
          el("button", {
            type: "button",
            className: "btn btn-ghost btn-tiny field-remove",
            text: "Remove",
            onClick: () => {
              const next = clone(value);
              delete next[k];
              api.structure(path, next);
            },
          })
        );
        body.appendChild(child);
      });

      const addRow = el("div", { className: "add-row" }, [
        el("input", { className: "input", placeholder: "Field name (e.g. title)", "data-role": "new-key" }),
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
            el("option", { value: "object", text: "Section" }),
            el("option", { value: "array", text: "List" }),
          ]
        ),
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-sm",
          text: "Add field",
          onClick: (e) => {
            const row = e.currentTarget.parentElement;
            const nk = row.querySelector('[data-role="new-key"]').value.trim();
            const nt = row.querySelector('[data-role="new-type"]').value;
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

      const isRoot = path.length === 0;
      return el("div", { className: "object-panel" + (isRoot ? " object-root" : "") }, [
        isRoot
          ? null
          : el("div", { className: "panel-title" }, [
              el("span", { text: labelFromKey(key) }),
              el("span", { className: "type-badge soft", text: "Section" }),
            ]),
        body,
        addRow,
      ]);
    }

    if (kind === "array") {
      const list = el("div", { className: "array-body" });
      const sample = value.length > 0 ? value[0] : { title: "", body: "<p></p>", published: true };

      value.forEach((item, index) => {
        const card = el("div", { className: "array-item" }, [
          el("div", { className: "array-item-head" }, [
            el("span", { className: "array-index", text: itemTitle(item, index) }),
            el("div", { className: "array-item-actions" }, [
              el("button", {
                type: "button",
                className: "btn btn-ghost btn-tiny",
                text: "↑",
                disabled: index === 0,
                onClick: () => {
                  if (index === 0) return;
                  const next = value.slice();
                  const tmp = next[index - 1];
                  next[index - 1] = next[index];
                  next[index] = tmp;
                  api.structure(path, next);
                },
              }),
              el("button", {
                type: "button",
                className: "btn btn-ghost btn-tiny",
                text: "↓",
                disabled: index === value.length - 1,
                onClick: () => {
                  if (index >= value.length - 1) return;
                  const next = value.slice();
                  const tmp = next[index + 1];
                  next[index + 1] = next[index];
                  next[index] = tmp;
                  api.structure(path, next);
                },
              }),
              el("button", {
                type: "button",
                className: "btn btn-ghost btn-tiny",
                text: "Duplicate",
                onClick: () => {
                  const next = value.slice();
                  next.splice(index + 1, 0, clone(item));
                  api.structure(path, next);
                },
              }),
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
            ]),
          ]),
        ]);
        const child = buildNode(item, path.concat(index), api, String(index));
        child.classList.add("array-item-body");
        card.appendChild(child);
        list.appendChild(card);
      });

      return el("div", { className: "array-panel" }, [
        el("div", { className: "panel-title" }, [
          el("span", { text: labelFromKey(key) }),
          el("span", { className: "type-badge soft", text: value.length + " items" }),
        ]),
        list,
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-sm",
          text: "Add item",
          onClick: () => {
            const next = value.slice();
            next.push(clone(sample));
            api.structure(path, next);
          },
        }),
      ]);
    }

    return fieldWrap(key, kind, el("p", { className: "muted", text: "Unsupported field" }));
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

    container.innerHTML = "";
    container.appendChild(buildNode(current, [], api, "root"));
  }

  global.FormEngine = { render, clone, typeOf, labelFromKey, fieldKind };
})(window);
