import type { RuntimeBranding } from "./branding.js";

const SHELL_MARKER = "data-mlclaw-shell";
const BRANDING_MARKER = "data-mlclaw-branding";
const CONTROL_BRANDING_MARKER = "data-mlclaw-control-branding";

export const CONTROL_BRANDING_SCRIPT_PATH = "/assets/mlclaw-control-branding.js";

export const CONTROL_BRANDING_SCRIPT = `(function () {
  var productName = "ML Claw";
  var marker = "data-mlclaw-control-branded";
  var observedRoots = new WeakSet();
  function inTopLeftBrandArea(node) {
    try {
      var range = document.createRange();
      range.selectNodeContents(node);
      var rect = range.getBoundingClientRect();
      range.detach();
      return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top <= 140 && rect.left >= 0 && rect.left <= 280;
    } catch (_) {
      return false;
    }
  }
  function updateTextNode(node) {
    var value = node.nodeValue || "";
    var trimmed = value.trim();
    if ((trimmed !== "Control" && trimmed !== "OpenClaw") || !inTopLeftBrandArea(node)) {
      return;
    }
    if (trimmed === "Control") {
      node.nodeValue = "";
    } else {
      node.nodeValue = value.replace("OpenClaw", productName);
    }
  }
  function scan(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      updateTextNode(node);
    }
  }
  function observe(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    var pending = false;
    function scheduleScan() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        scan(root);
      });
    }
    scan(root);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].type === "characterData") {
          updateTextNode(mutations[i].target);
        } else {
          scheduleScan();
        }
      }
    }).observe(root, { childList: true, characterData: true, subtree: true });
  }
  function observeExistingShadowRoots(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("*").forEach(function (element) {
      if (element.shadowRoot) {
        observe(element.shadowRoot);
        observeExistingShadowRoots(element.shadowRoot);
      }
    });
  }
  if (!document.documentElement.hasAttribute(marker)) {
    document.documentElement.setAttribute(marker, "1");
    var attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function () {
      var shadow = attachShadow.apply(this, arguments);
      observe(shadow);
      return shadow;
    };
    observe(document);
    observeExistingShadowRoots(document);
    requestAnimationFrame(function () {
      observeExistingShadowRoots(document);
      scan(document);
    });
  }
})();
`;

export const SERVICE_WORKER_RESET_SCRIPT = `self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    if (self.caches && caches.keys) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));
    }
    if (self.clients && clients.claim) {
      await clients.claim();
    }
    if (self.registration && self.registration.unregister) {
      await self.registration.unregister();
    }
  })());
});
`;

export function shouldInjectShell(params: {
  method: string | undefined;
  requestAccept: string | undefined;
  responseContentType: string | undefined;
  responseContentEncoding?: string | undefined;
}): boolean {
  const method = params.method ?? "GET";
  return (method === "GET" || method === "HEAD") &&
    (params.requestAccept ?? "").includes("text/html") &&
    (params.responseContentType ?? "").toLowerCase().includes("text/html") &&
    !params.responseContentEncoding;
}

export function rewriteOpenClawHtml(html: string, branding: RuntimeBranding): string {
  return injectMlClawShell(injectBranding(html, branding), branding);
}

export function injectMlClawShell(html: string, branding: RuntimeBranding): string {
  const shell = `
<div ${SHELL_MARKER} style="position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;">
  <a href="/mlclaw" aria-label="Open ${escapeHtml(branding.name)} settings" title="${escapeHtml(branding.name)}" style="box-sizing:border-box;display:flex;width:34px;height:34px;aspect-ratio:1/1;align-items:center;justify-content:center;border:1px solid rgba(15,23,42,.16);border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 8px 18px rgba(15,23,42,.14);color:#111827;text-decoration:none;">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:18px;height:18px;">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  </a>
</div>
`;
  const brandingScript = `<script ${CONTROL_BRANDING_MARKER} src="${CONTROL_BRANDING_SCRIPT_PATH}"></script>\n`;
  if (html.includes(SHELL_MARKER)) {
    return html;
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${shell}${brandingScript}</body>`);
  }
  return `${html}${shell}${brandingScript}`;
}

function injectBranding(html: string, branding: RuntimeBranding): string {
  const title = `${escapeHtml(branding.name)} Control`;
  let out = html;
  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>\n<title>${title}</title>`);
  }
  const meta = `
<meta ${BRANDING_MARKER} name="application-name" content="${escapeHtml(branding.name)}">
<meta ${BRANDING_MARKER} name="apple-mobile-web-app-title" content="${escapeHtml(branding.shortName)}">
<meta ${BRANDING_MARKER} name="theme-color" content="${escapeHtml(branding.themeColor)}">
`;
  if (!out.includes(BRANDING_MARKER) && out.includes("</head>")) {
    out = out.replace("</head>", `${meta}</head>`);
  }
  return out;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
