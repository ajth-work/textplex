const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repoRoot = path.resolve(__dirname, "../../..");

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return data.has(String(key)) ? data.get(String(key)) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(String(key));
    },
    clear() {
      data.clear();
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    get length() {
      return data.size;
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

function createNode(tagName = "div") {
  const listeners = new Map();
  const attributes = new Map();
  const children = [];
  const classSet = new Set();
  const node = {
    tagName: String(tagName).toUpperCase(),
    style: {},
    children,
    hidden: false,
    disabled: false,
    className: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    appendChild(child) {
      children.push(child);
      return child;
    },
    setAttribute(name, value) {
      attributes.set(String(name), String(value));
    },
    getAttribute(name) {
      return attributes.has(String(name)) ? attributes.get(String(name)) : null;
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    dispatchEvent(event) {
      const handlers = listeners.get(event.type) ?? [];
      for (const handler of handlers) {
        handler.call(node, event);
      }
    },
    click() {
      node.dispatchEvent({ type: "click", target: node, preventDefault() {}, stopPropagation() {} });
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  node.classList = {
    add(...tokens) {
      for (const token of tokens) {
        classSet.add(String(token));
      }
      node.className = Array.from(classSet).join(" ");
    },
    remove(...tokens) {
      for (const token of tokens) {
        classSet.delete(String(token));
      }
      node.className = Array.from(classSet).join(" ");
    },
    toggle(token, force) {
      const name = String(token);
      const next = typeof force === "boolean" ? force : !classSet.has(name);
      if (next) {
        classSet.add(name);
      } else {
        classSet.delete(name);
      }
      node.className = Array.from(classSet).join(" ");
      return next;
    },
    contains(token) {
      return classSet.has(String(token));
    },
  };

  return node;
}

function createPagerNode() {
  let html = "";
  let previousButton = null;
  let nextButton = null;
  const node = createNode("div");

  Object.defineProperty(node, "innerHTML", {
    get() {
      return html;
    },
    set(value) {
      html = String(value);
      previousButton = createNode("button");
      previousButton.setAttribute("aria-label", "Previous sentence");
      nextButton = createNode("button");
      nextButton.setAttribute("aria-label", "Next sentence");
    },
  });

  node.querySelector = (selector) => {
    if (selector.includes("Previous sentence")) {
      return previousButton;
    }
    if (selector.includes("Next sentence")) {
      return nextButton;
    }
    return null;
  };

  node.querySelectorAll = () => [previousButton, nextButton].filter(Boolean);

  return node;
}

function createSentenceLineNode() {
  let html = "";
  let tokens = [];
  const node = createNode("div");

  const parseAttributes = (attributeSource, target) => {
    const classMatch = attributeSource.match(/class="([^"]*)"/);
    if (classMatch) {
      classMatch[1]
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => target.classList.add(token));
    }

    const attributePattern = /([:\w-]+)="([^"]*)"/g;
    let match;
    while ((match = attributePattern.exec(attributeSource))) {
      const name = String(match[1]);
      const value = String(match[2]);
      target.setAttribute(name, value);
      if (name.startsWith("data-")) {
        const dataKey = name
          .slice(5)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        target.dataset[dataKey] = value;
      }
    }
  };

  const parseTokens = (markup) => {
    tokens = [];
    const tokenPattern = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
    let match;
    while ((match = tokenPattern.exec(markup))) {
      const attributeSource = match[1] ?? "";
      if (!/\btoken\b/.test(attributeSource)) {
        continue;
      }

      const token = createNode("button");
      parseAttributes(attributeSource, token);
      token.innerHTML = match[2];
      tokens.push(token);
    }
  };

  Object.defineProperty(node, "innerHTML", {
    get() {
      return html;
    },
    set(value) {
      html = String(value);
      parseTokens(html);
    },
  });

  node.querySelectorAll = (selector) => {
    if (selector === ".token") {
      return tokens;
    }
    if (selector === ".token.is-selected") {
      return tokens.filter((token) => token.classList.contains("is-selected"));
    }
    return [];
  };

  node.querySelector = (selector) => {
    if (selector === ".token.is-selected") {
      return tokens.find((token) => token.classList.contains("is-selected")) ?? null;
    }
    if (selector === ".token") {
      return tokens[0] ?? null;
    }
    return null;
  };

  return node;
}

function createDocumentStub(selectorMap = {}, idMap = {}) {
  const body = createNode("body");
  const document = {
    title: "",
    body,
    createElement(tagName) {
      return createNode(tagName);
    },
    querySelector(selector) {
      const value = selectorMap[selector];
      if (Array.isArray(value)) {
        return value[0] ?? null;
      }
      return value ?? null;
    },
    querySelectorAll(selector) {
      const value = selectorMap[selector];
      if (!value) {
        return [];
      }
      return Array.isArray(value) ? value : [value];
    },
    getElementById(id) {
      return idMap[id] ?? null;
    },
  };

  body.appendChild = () => {};
  return document;
}

function createLocation(pathname = "/index.html", search = "") {
  let href = `http://example.test${pathname}${search}`;
  const location = {};

  Object.defineProperty(location, "href", {
    get() {
      return href;
    },
    set(value) {
      const next = new URL(String(value), href);
      href = next.href;
      location.pathname = next.pathname;
      location.search = next.search;
    },
  });

  const initial = new URL(href);
  location.pathname = initial.pathname;
  location.search = initial.search;
  return location;
}

function createBrowserContext({
  pathname = "/index.html",
  search = "",
  localStorageSeed = {},
  sessionStorageSeed = {},
  selectorMap = {},
  idMap = {},
  fetchImpl = null,
} = {}) {
  const location = createLocation(pathname, search);
  const document = createDocumentStub(selectorMap, idMap);
  const window = {
    location,
    localStorage: createStorage(localStorageSeed),
    sessionStorage: createStorage(sessionStorageSeed),
    history: {
      replaceState() {},
    },
    document,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    Intl,
    FormData: globalThis.FormData,
    Blob: globalThis.Blob,
    File: globalThis.File,
    console,
  };

  if (fetchImpl) {
    window.fetch = fetchImpl;
  }

  window.window = window;
  window.self = window;
  window.globalThis = window;
  document.defaultView = window;

  const context = vm.createContext({
    window,
    document,
    console,
    URL,
    URLSearchParams,
    Intl,
    FormData: globalThis.FormData,
    Blob: globalThis.Blob,
    File: globalThis.File,
    setTimeout,
    clearTimeout,
    fetch: fetchImpl,
    Math,
    JSON,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    encodeURIComponent,
    decodeURIComponent,
  });

  return { window, document, context };
}

function loadBrowserScript(relativePath, context) {
  const source = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function loadPreviewData(options = {}) {
  const browser = createBrowserContext(options);
  loadBrowserScript("site/preview-data.js", browser.context);
  return browser;
}

function loadPreviewRouter(options = {}) {
  const browser = createBrowserContext(options);
  loadBrowserScript("site/preview-data.js", browser.context);
  loadBrowserScript("site/preview-router.js", browser.context);
  return browser;
}

module.exports = {
  createBrowserContext,
  createNode,
  createPagerNode,
  createSentenceLineNode,
  loadPreviewData,
  loadPreviewRouter,
};
