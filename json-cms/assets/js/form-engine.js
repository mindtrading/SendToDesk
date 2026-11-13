/**
 * Auto form engine: JSON → editable fields → JSON
 * Primitive edits update data in place (no remount).
 * Structural edits (add/remove) call onStructure so the host can remount.
 */
(function (global) {
  function isLongString(s) {
    return typeof s === "string" && (s.length > 80 || s.includes("\n") || /<\/?[a-z][\s\S]*>/i.test(s));
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

  function emptyForType(t) {
    switch (t) {
      case "string":
        return "";
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
      default:
        return "";
    }
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

  function fieldWrap(key, typeBadge, control) {
    return el("div", { className: "field" }, [
      el("div", { className: "field-head" }, [
        el("label", { className: "field-label", text: labelFromKey(key) }),
        el("span", { className: "type-badge", text: typeBadge }),
      ]),
      control,
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

  function buildNode(value, path, api, keyName) {
    const t = typeOf(value);
    const key = keyName == null ? path[path.length - 1] : keyName;

    if (t === "string") {
      const long = isLongString(value);
      const input = el(long ? "textarea" : "input", {
        className: long ? "input textarea" : "input",
        rows: long ? "5" : undefined,
        type: long ? undefined : "text",
        onInput: (e) => api.change(path, e.target.value),
      });
      input.value = value;
      return fieldWrap(key, "string", input);
    }

    if (t === "number") {
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
      return fieldWrap(key, "number", input);
    }

    if (t === "boolean") {
      const text = el("span", { className: "toggle-text", text: value ? "True" : "False" });
      const input = el("input", {
        type: "checkbox",
        checked: !!value,
        onChange: (e) => {
          text.textContent = e.target.checked ? "True" : "False";
          api.change(path, e.target.checked);
        },
      });
      const wrap = el("label", { className: "toggle" }, [
        input,
        el("span", { className: "toggle-ui" }),
        text,
      ]);
      return fieldWrap(key, "boolean", wrap);
    }

    if (t === "null") {
      const row = el("div", { className: "null-row" }, [
        el("span", { className: "muted", text: "null" }),
        el(
          "select",
          {
            className: "input select-sm",
            onChange: (e) => {
              const nt = e.target.value;
              if (!nt) return;
              api.structure(path, emptyForType(nt));
            },
          },
          [
            el("option", { value: "", text: "Set type…" }),
            el("option", { value: "string", text: "string" }),
            el("option", { value: "number", text: "number" }),
            el("option", { value: "boolean", text: "boolean" }),
            el("option", { value: "object", text: "object" }),
            el("option", { value: "array", text: "array" }),
          ]
        ),
      ]);
      return fieldWrap(key, "null", row);
    }

    if (t === "object") {
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
        el("input", { className: "input", placeholder: "new key", "data-role": "new-key" }),
        el(
          "select",
          { className: "input select-sm", "data-role": "new-type" },
          [
            el("option", { value: "string", text: "string" }),
            el("option", { value: "number", text: "number" }),
            el("option", { value: "boolean", text: "boolean" }),
            el("option", { value: "object", text: "object" }),
            el("option", { value: "array", text: "array" }),
            el("option", { value: "null", text: "null" }),
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
              alert("Key already exists");
              return;
            }
            const next = clone(value);
            next[nk] = emptyForType(nt);
            api.structure(path, next);
          },
        }),
      ]);

      return el("div", { className: "object-panel" }, [
        el("div", { className: "panel-title" }, [
          el("span", { text: labelFromKey(key) }),
          el("span", { className: "type-badge", text: "object" }),
        ]),
        body,
        addRow,
      ]);
    }

    if (t === "array") {
      const list = el("div", { className: "array-body" });
      const itemType = value.length > 0 ? typeOf(value[0]) : "object";

      value.forEach((item, index) => {
        const card = el("div", { className: "array-item" }, [
          el("div", { className: "array-item-head" }, [
            el("span", { className: "array-index", text: `#${index + 1}` }),
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
        ]);
        const child = buildNode(item, path.concat(index), api, String(index));
        child.classList.add("array-item-body");
        card.appendChild(child);
        list.appendChild(card);
      });

      return el("div", { className: "array-panel" }, [
        el("div", { className: "panel-title" }, [
          el("span", { text: labelFromKey(key) }),
          el("span", { className: "type-badge", text: `array (${value.length})` }),
        ]),
        list,
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-sm",
          text: "Add item",
          onClick: () => {
            const next = value.slice();
            if (value.length > 0) next.push(clone(value[0]));
            else next.push(emptyForType(itemType));
            api.structure(path, next);
          },
        }),
      ]);
    }

    return fieldWrap(key, t, el("p", { className: "muted", text: "Unsupported type" }));
  }

  /**
   * @param {HTMLElement} container
   * @param {any} data
   * @param {{ onChange: (next:any)=>void, onStructure: (next:any)=>void }} hooks
   */
  function render(container, data, hooks) {
    const onChange = typeof hooks === "function" ? hooks : hooks.onChange;
    const onStructure =
      typeof hooks === "function"
        ? hooks
        : hooks.onStructure || hooks.onChange;

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

  global.FormEngine = { render, clone, typeOf, labelFromKey };
})(window);
