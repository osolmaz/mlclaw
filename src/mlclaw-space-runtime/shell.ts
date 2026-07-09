const SHELL_MARKER = "data-mlclaw-shell";

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

export function injectMlClawShell(html: string): string {
  if (html.includes(SHELL_MARKER)) {
    return html;
  }
  const shell = `
<div ${SHELL_MARKER} style="position:fixed;right:16px;bottom:16px;z-index:2147483647;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <nav style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(15,23,42,.14);border-radius:8px;background:rgba(255,255,255,.96);box-shadow:0 12px 30px rgba(15,23,42,.16);color:#111827;">
    <a href="/mlclaw" style="font-weight:700;color:#111827;text-decoration:none;">ML Claw</a>
    <a href="/mlclaw/settings" style="color:#374151;text-decoration:none;">Settings</a>
    <a href="/mlclaw/status" style="color:#374151;text-decoration:none;">Status</a>
    <a href="/mlclaw/logout" style="color:#374151;text-decoration:none;">Sign out</a>
  </nav>
</div>
`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${shell}</body>`);
  }
  return `${html}${shell}`;
}
