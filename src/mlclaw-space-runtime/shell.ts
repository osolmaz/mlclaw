import type { RuntimeBranding } from "./branding.js";

const SHELL_MARKER = "data-mlclaw-shell";
const BRANDING_MARKER = "data-mlclaw-branding";
const CONTROL_BRANDING_MARKER = "data-mlclaw-control-branding";
const BROKERKIT_DELEGATED_UI_BOOTSTRAP = Buffer.from(
  JSON.stringify({ version: 1, mode: "delegated-web", basePath: "/mlclaw/api/brokerkit" }),
  "utf8",
).toString("base64url");

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
  function installApprovals() {
    var shell = document.querySelector("[data-mlclaw-shell]");
    var button = document.querySelector("[data-mlclaw-approvals-button]");
    var popover = document.querySelector("[data-mlclaw-approvals-popover]");
    var frame = document.querySelector("[data-mlclaw-approvals-frame]");
    var badge = document.querySelector("[data-mlclaw-approvals-badge]");
    var close = document.querySelector("[data-mlclaw-approvals-close]");
    if (!shell || !button || !popover || !frame || button.getAttribute("data-ready") === "1") return;
    button.setAttribute("data-ready", "1");
    function invalidateFrame() {
      if (frame.contentWindow) {
        frame.contentWindow.postMessage({ type: "brokerkit.operator-ui.invalidate", version: 1 }, "*");
      }
    }
    function setOpen(open) {
      popover.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) return;
      if (!frame.getAttribute("src")) frame.setAttribute("src", frame.getAttribute("data-src"));
      else invalidateFrame();
    }
    frame.addEventListener("load", function () { if (!popover.hidden) invalidateFrame(); });
    button.addEventListener("click", function () { setOpen(popover.hidden); });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("click", function (event) {
      if (!popover.hidden && !shell.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (
        event.source !== frame.contentWindow ||
        !data ||
        typeof data !== "object" ||
        Object.keys(data).sort().join(",") !== "nonce,type,version" ||
        data.type !== "brokerkit.delegated-web.open" ||
        data.version !== 1 ||
        typeof data.nonce !== "string" ||
        !/^[a-f0-9]{32}$/.test(data.nonce)
      ) return;
      window.location.assign("/plugins/brokerkit/ui/#${BROKERKIT_DELEGATED_UI_BOOTSTRAP}");
    });
    var summaryCursor = "";
    var stopped = false;
    function acceptSummary(summary) {
      if (
        !summary ||
        typeof summary !== "object" ||
        Object.keys(summary).sort().join(",") !== "api_version,cursor,healthy,pending" ||
        summary.api_version !== "brokerkit.io/operator-ui/v1" ||
        typeof summary.cursor !== "string" ||
        summary.cursor.length < 1 ||
        summary.cursor.length > 128 ||
        typeof summary.pending !== "number" ||
        !Number.isSafeInteger(summary.pending) ||
        summary.pending < 0 ||
        typeof summary.healthy !== "boolean"
      ) return false;
      var changed = summaryCursor && summaryCursor !== summary.cursor;
      summaryCursor = summary.cursor;
      if (badge) {
        badge.textContent = summary.pending > 99 ? "99+" : String(summary.pending);
        badge.hidden = summary.pending < 1;
      }
      button.setAttribute("aria-label", summary.pending > 0 ? "Open approval requests (" + summary.pending + " pending)" : "Open approval requests");
      if (changed) invalidateFrame();
      return true;
    }
    function refresh() {
      return fetch("/mlclaw/api/brokerkit/summary", { credentials: "same-origin", cache: "no-store" })
        .then(function (response) { return response.ok ? response.json() : null; })
        .then(acceptSummary)
        .catch(function () { return false; });
    }
    function watch(delay) {
      if (stopped) return;
      if (!summaryCursor) {
        refresh().then(function () { window.setTimeout(function () { watch(250); }, delay); });
        return;
      }
      fetch("/mlclaw/api/brokerkit/summary/events?cursor=" + encodeURIComponent(summaryCursor) + "&wait_seconds=25", {
        credentials: "same-origin",
        cache: "no-store"
      }).then(function (response) {
        if (response.status === 410) {
          summaryCursor = "";
          return null;
        }
        if (!response.ok) throw new Error("summary unavailable");
        return response.json();
      }).then(function (event) {
        if (
          event &&
          typeof event === "object" &&
          Object.keys(event).sort().join(",") === "api_version,changed,cursor" &&
          event.api_version === "brokerkit.io/operator-ui/v1" &&
          typeof event.cursor === "string" &&
          event.cursor.length >= 1 &&
          event.cursor.length <= 128 &&
          typeof event.changed === "boolean"
        ) {
          summaryCursor = event.cursor;
          if (event.changed) invalidateFrame();
          return event.changed ? refresh() : true;
        }
        return false;
      }).then(function (ok) {
        window.setTimeout(function () { watch(ok ? 250 : Math.min(delay * 2, 30000)); }, ok ? 0 : delay);
      }).catch(function () {
        window.setTimeout(function () { watch(Math.min(delay * 2, 30000)); }, delay);
      });
    }
    refresh().then(function () { watch(250); });
    window.setInterval(refresh, 300000);
    window.addEventListener("focus", function () { refresh(); });
    window.addEventListener("beforeunload", function () { stopped = true; });
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
      installApprovals();
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
  return (
    (method === "GET" || method === "HEAD") &&
    (params.requestAccept ?? "").includes("text/html") &&
    (params.responseContentType ?? "").toLowerCase().includes("text/html") &&
    !params.responseContentEncoding
  );
}

export function rewriteOpenClawHtml(html: string, branding: RuntimeBranding): string {
  return injectMlClawShell(injectBranding(html, branding), branding);
}

export function injectMlClawShell(html: string, branding: RuntimeBranding): string {
  const shell = `
<div ${SHELL_MARKER} style="position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;">
  <section data-mlclaw-approvals-popover hidden aria-label="Approval requests" style="position:absolute;left:0;bottom:44px;box-sizing:border-box;width:min(420px,calc(100vw - 24px));height:min(620px,calc(100dvh - 72px));overflow:hidden;border:1px solid rgba(15,23,42,.16);border-radius:14px;background:white;box-shadow:0 18px 48px rgba(15,23,42,.24);">
    <header style="box-sizing:border-box;display:flex;height:42px;align-items:center;justify-content:space-between;padding:0 10px 0 14px;border-bottom:1px solid rgba(15,23,42,.1);color:#111827;font:600 14px system-ui;">
      <span>Approvals</span>
      <button data-mlclaw-approvals-close type="button" aria-label="Close approval requests" style="display:grid;width:30px;height:30px;place-items:center;border:0;border-radius:7px;background:transparent;color:#475569;cursor:pointer;font:20px/1 system-ui;">&times;</button>
    </header>
    <iframe data-mlclaw-approvals-frame data-src="/plugins/brokerkit/ui/?embed=popover#${BROKERKIT_DELEGATED_UI_BOOTSTRAP}" title="Approval requests" sandbox="allow-scripts" style="display:block;width:100%;height:calc(100% - 42px);border:0;background:white;"></iframe>
  </section>
  <div style="display:flex;gap:8px;align-items:center;">
  <a href="/mlclaw" aria-label="Open ${escapeHtml(branding.name)} settings" title="${escapeHtml(branding.name)}" style="box-sizing:border-box;display:flex;width:34px;height:34px;aspect-ratio:1/1;align-items:center;justify-content:center;border:1px solid rgba(15,23,42,.16);border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 8px 18px rgba(15,23,42,.14);color:#111827;text-decoration:none;">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:18px;height:18px;">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  </a>
  <button data-mlclaw-approvals-button type="button" aria-label="Open approval requests" aria-expanded="false" style="position:relative;box-sizing:border-box;display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(15,23,42,.16);border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 8px 18px rgba(15,23,42,.14);color:#111827;cursor:pointer;">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg>
    <span data-mlclaw-approvals-badge hidden style="position:absolute;place-items:center;min-width:17px;height:17px;right:-6px;top:-7px;padding:0 4px;border:2px solid white;border-radius:999px;background:#dc2626;color:white;font:700 9px system-ui;"></span>
  </button>
  </div>
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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
