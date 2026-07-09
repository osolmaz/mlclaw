import type { SpaceRuntimeConfig } from "./config.js";

export function templatePage(config: SpaceRuntimeConfig): string {
  return page("ML Claw", `
    <main>
      <img src="/assets/mlclaw.svg" alt="ML Claw" class="logo">
      <h1>ML Claw</h1>
      <p>Run the local bootstrapper to create a Hugging Face hosted OpenClaw agent for ML workflows.</p>
      <p class="notice">Do not set this up by only clicking Duplicate. The bootstrapper creates the private Space, private Storage Bucket, OAuth settings, secrets, model configuration, and local manifest.</p>
      <h2>With Node.js</h2>
      <pre><code>npx mlclaw@latest bootstrap --name mlclaw</code></pre>
      <h2>macOS or Linux without Node.js</h2>
      <pre><code>bash &lt;(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) --name mlclaw</code></pre>
      <h2>Windows PowerShell</h2>
      <pre><code>irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex</code></pre>
      <ol>
        <li>Run one of the commands above on your own machine.</li>
        <li>Follow the prompts and choose an agent name.</li>
        <li>Open the Space that ML Claw creates and sign in with Hugging Face.</li>
      </ol>
      <p class="muted">Manual duplication is for development or advanced setup only.</p>
      <p class="muted">Source Space: ${escapeHtml(config.spaceId ?? config.canonicalSpaceId)}</p>
    </main>
  `);
}

export function loginPage(config: SpaceRuntimeConfig, message?: string, next = "/"): string {
  const oauthReady = Boolean(config.oauthClientId && config.oauthClientSecret);
  const loginPath = next === "/"
    ? "/oauth/login"
    : `/oauth/login?next=${encodeURIComponent(next)}`;
  const loginHref = new URL(loginPath, config.publicUrl).toString();
  return page(`${config.branding.name} Login`, `
    <main>
      <img src="/assets/hf-logo.svg" alt="Hugging Face" class="logo">
      <h1>${escapeHtml(config.branding.name)}</h1>
      ${message ? `<p class="notice">${escapeHtml(message)}</p>` : ""}
      ${oauthReady
        ? `<a class="button" href="${escapeHtml(loginHref)}" target="_blank" rel="noopener">Sign in with Hugging Face</a>`
        : `<p class="notice">Hugging Face OAuth is not configured for this Space. Update the Space README metadata to include <code>hf_oauth: true</code>, then rebuild.</p>`}
    </main>
  `);
}

export function unauthorizedPage(username: string): string {
  return page("ML Claw Access", `
    <main>
      <h1>Access not allowed</h1>
      <p>The signed-in Hugging Face account <strong>${escapeHtml(username)}</strong> is not allowed to operate this Space.</p>
      <p class="muted">Set <code>MLCLAW_ALLOWED_USERS</code> to a comma-separated list of usernames, then restart the Space.</p>
      <a class="button secondary" href="/mlclaw/logout">Sign out</a>
    </main>
  `);
}

export function adminRequiredPage(username: string): string {
  return page("ML Claw Admin", `
    <main>
      <h1>Admin required</h1>
      <p>The signed-in Hugging Face account <strong>${escapeHtml(username)}</strong> can use this Space, but cannot change credentials.</p>
      <p class="muted">Set <code>MLCLAW_ADMINS</code> to a comma-separated list of admin usernames.</p>
      <p><a href="/">Back to gateway</a></p>
    </main>
  `);
}

export function openAiPage(configured: boolean, persistent: boolean): string {
  return page("OpenAI Credentials", `
    <main>
      <h1>OpenAI account</h1>
      <p class="muted">Store an OpenAI API key as a Hugging Face Space Secret. The key is never sent to the browser after submission.</p>
      <form method="post" action="/mlclaw/openai">
        <label for="apiKey">OpenAI API key</label>
        <input id="apiKey" name="apiKey" type="password" autocomplete="off" placeholder="sk-..." required>
        <button class="button" type="submit">Save key</button>
      </form>
      <p class="${configured ? "ok" : "notice"}">Runtime key: ${configured ? "configured" : "not configured"}</p>
      <p class="${persistent ? "ok" : "notice"}">Space Secret: ${persistent ? "updated" : "not confirmed"}</p>
      <p><a href="/">Back to gateway</a></p>
    </main>
  `);
}

export function statusJson(params: {
  config: SpaceRuntimeConfig;
  openclawRunning: boolean;
  openAiConfigured: boolean;
}): string {
  return JSON.stringify({
    ok: true,
    mode: params.config.mode,
    agent: params.config.agentName ?? null,
    space: params.config.spaceId ?? null,
    stateBucket: params.config.stateBucket ?? null,
    runtimeImage: params.config.runtimeImage ?? null,
    openclaw: {
      running: params.openclawRunning,
      host: params.config.openclawHost,
      port: params.config.openclawPort,
    },
    auth: {
      hfOAuthConfigured: Boolean(params.config.oauthClientId && params.config.oauthClientSecret),
      allowedUsers: params.config.allowedUsers,
      allowAnySignedIn: params.config.allowAnySignedIn,
    },
    openai: {
      configured: params.openAiConfigured,
    },
  }, null, 2);
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/manifest.webmanifest">
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7fb; color: #111827; }
    main { width: min(680px, calc(100vw - 40px)); padding: 32px 0; }
    .logo { width: 72px; height: 72px; display: block; margin-bottom: 20px; }
    h1 { font-size: 42px; line-height: 1.05; margin: 0 0 16px; letter-spacing: 0; }
    h2 { font-size: 16px; line-height: 1.35; margin: 22px 0 8px; letter-spacing: 0; }
    p, li { font-size: 17px; line-height: 1.55; }
    ol { padding-left: 22px; }
    pre { overflow-x: auto; margin: 0 0 10px; padding: 14px 16px; border-radius: 8px; background: #111827; color: #f9fafb; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.95em; }
    label { display: block; font-weight: 650; margin-bottom: 8px; }
    input { box-sizing: border-box; width: 100%; padding: 12px 14px; border: 1px solid #c7d2fe; border-radius: 8px; font-size: 16px; margin-bottom: 14px; background: white; color: #111827; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px; border-radius: 8px; background: #111827; color: white; text-decoration: none; border: 0; font-size: 16px; cursor: pointer; }
    .secondary { background: #374151; }
    .muted { color: #4b5563; }
    .notice { color: #92400e; }
    .ok { color: #047857; }
    @media (prefers-color-scheme: dark) {
      body { background: #0b1020; color: #f9fafb; }
      pre { background: #020617; }
      input { background: #111827; color: #f9fafb; border-color: #374151; }
      .button { background: #f9fafb; color: #111827; }
      .secondary { background: #9ca3af; color: #111827; }
      .muted { color: #cbd5e1; }
      .notice { color: #fbbf24; }
      .ok { color: #34d399; }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
