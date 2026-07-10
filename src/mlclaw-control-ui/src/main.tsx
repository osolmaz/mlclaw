import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Session = {
  user: string;
  admin: boolean;
  csrfToken: string;
  branding?: Branding;
};

type Branding = {
  name: string;
  shortName: string;
  themeColor: string;
  logoUrl: string;
};

type ModelPricing = {
  input?: number;
  output?: number;
};

type ModelChoice = {
  key: string;
  modelId: string;
  provider: string;
  openclawModel: string;
  label: string;
  note?: string;
  contextLength?: number;
  pricing?: ModelPricing;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
  firstTokenLatencyMs?: number;
  throughput?: number;
  status?: string;
  preset?: boolean;
};

type Settings = {
  agentName: string | null;
  model: string;
  stateBucket: string | null;
  stateMountDir: string | null;
  statePrefix: string | null;
  gatewayLocation: string | null;
  runtimeImage: string | null;
  runtimeId: string | null;
  templateRev: string | null;
  allowedUsers: string[];
  adminUsers: string[];
  modelChoices: ModelChoice[];
  presetModels: ModelChoice[];
  branding: Branding;
};

type RouterModelsResult = {
  ok: boolean;
  models: ModelChoice[];
  fetchedAt: string | null;
  error?: string;
};

type Status = {
  ok: boolean;
  mode: string;
  agent: string | null;
  model: string;
  space: string | null;
  stateBucket: string | null;
  stateMountDir: string | null;
  statePrefix: string | null;
  gatewayLocation: string | null;
  runtimeImage: string | null;
  runtimeId: string | null;
  templateRev: string | null;
  openclaw: {
    running: boolean;
    host: string;
    port: number;
  };
  auth: {
    hfOAuthConfigured: boolean;
    allowedUsers: string[];
    adminUsers: string[];
    allowAnySignedIn: boolean;
  };
  openai: {
    configured: boolean;
    environmentConfigured: boolean;
    runtimeFileConfigured: boolean;
  };
  integrations: {
    automatic: boolean;
    source: "local" | "oauth" | null;
    identity: string | null;
    configured: boolean;
    scope: string[];
    expiresAt: string | null;
    refreshable: boolean;
    error: string | null;
    servers: Array<{ id: string; name: string; enabled: boolean }>;
  };
  branding: Branding;
};

type View = "overview" | "settings" | "credentials" | "status";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "ready"; session: Session; settings: Settings; status: Status };

const routes: Record<View, string> = {
  overview: "/mlclaw",
  settings: "/mlclaw/settings",
  credentials: "/mlclaw/credentials",
  status: "/mlclaw/status",
};

function App() {
  const [view, setView] = useState<View>(viewFromPath(window.location.pathname));
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [notice, setNotice] = useState<string | undefined>();

  const refresh = async () => {
    setState({ kind: "loading" });
    try {
      const [session, settings, status] = await Promise.all([
        apiGet<Session>("/mlclaw/api/session"),
        apiGet<Settings>("/mlclaw/api/settings"),
        apiGet<Status>("/mlclaw/api/status"),
      ]);
      setState({ kind: "ready", session, settings, status });
    } catch (err) {
      setState({ kind: "error", error: errorMessage(err) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (state.kind === "ready") {
      document.title = state.settings.branding.name;
    }
  }, [state]);

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: View) => {
    setView(next);
    window.history.pushState(undefined, "", routes[next]);
  };

  if (state.kind === "loading") {
    return <Frame view={view} onNavigate={navigate}><ScreenMessage title="Loading" body="Reading deployment settings." /></Frame>;
  }
  if (state.kind === "error") {
    return <Frame view={view} onNavigate={navigate}><ScreenMessage title="Could not load ML Claw" body={state.error} /></Frame>;
  }

  return (
    <Frame view={view} onNavigate={navigate} session={state.session} branding={state.settings.branding}>
      {notice ? <Banner>{notice}</Banner> : null}
      {view === "overview" ? <Overview settings={state.settings} status={state.status} onNavigate={navigate} /> : null}
      {view === "settings" ? (
        <SettingsPage
          session={state.session}
          settings={state.settings}
          onNotice={setNotice}
          onRefresh={refresh}
        />
      ) : null}
      {view === "credentials" ? (
        <CredentialsPage
          session={state.session}
          status={state.status}
          onNotice={setNotice}
          onRefresh={refresh}
        />
      ) : null}
      {view === "status" ? <StatusPage status={state.status} settings={state.settings} onRefresh={refresh} /> : null}
    </Frame>
  );
}

function Frame(props: {
  children: React.ReactNode;
  view: View;
  onNavigate: (view: View) => void;
  session?: Session;
  branding?: Branding;
}) {
  const logout = async () => {
    try {
      if (props.session?.csrfToken) {
        await apiPost("/mlclaw/api/logout", {}, props.session.csrfToken);
      }
    } finally {
      window.location.href = "/";
    }
  };

  const branding = props.branding ?? props.session?.branding ?? {
    name: "ML Claw",
    shortName: "ML Claw",
    themeColor: "#111827",
    logoUrl: "/assets/mlclaw.svg",
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/">
          <img src={branding.logoUrl} alt="" />
          <span>{branding.name}</span>
        </a>
        <nav>
          <NavButton label="Overview" active={props.view === "overview"} onClick={() => props.onNavigate("overview")} />
          <NavButton label="Settings" active={props.view === "settings"} onClick={() => props.onNavigate("settings")} />
          <NavButton label="Credentials" active={props.view === "credentials"} onClick={() => props.onNavigate("credentials")} />
          <NavButton label="Status" active={props.view === "status"} onClick={() => props.onNavigate("status")} />
        </nav>
        <div className="sidebarFooter">
          {props.session ? <span className="signedIn">{props.session.user}{props.session.admin ? " admin" : ""}</span> : null}
          <button className="secondaryButton" type="button" onClick={logout}>Sign out</button>
          <a className="secondaryLink" href="/">Open gateway</a>
        </div>
      </aside>
      <main className="content">{props.children}</main>
    </div>
  );
}

function NavButton(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={props.active ? "nav active" : "nav"} type="button" onClick={props.onClick}>
      {props.label}
    </button>
  );
}

function Overview(props: { settings: Settings; status: Status; onNavigate: (view: View) => void }) {
  return (
    <>
      <Header title={props.settings.branding.name} subtitle="Deployment overview" />
      <div className="grid">
        <Metric label="Gateway" value={props.status.openclaw.running ? "Running" : "Not ready"} tone={props.status.openclaw.running ? "good" : "warn"} />
        <Metric label="Model" value={props.settings.model} />
        <Metric label="Bucket" value={props.settings.stateBucket ?? "Not set"} />
        <Metric label="OpenAI" value={props.status.openai.configured ? "Configured" : "Not configured"} tone={props.status.openai.configured ? "good" : "neutral"} />
        <Metric label="HF integrations" value={props.status.integrations.configured ? "Connected" : "Sign in again"} tone={props.status.integrations.configured ? "good" : "warn"} />
      </div>
      <section className="panel">
        <h2>Actions</h2>
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={() => props.onNavigate("settings")}>Change model</button>
          <button className="secondaryButton" type="button" onClick={() => props.onNavigate("credentials")}>Set OpenAI key</button>
          <a className="secondaryLink" href="/">Open gateway</a>
        </div>
      </section>
    </>
  );
}

function SettingsPage(props: {
  session: Session;
  settings: Settings;
  onNotice: (notice: string | undefined) => void;
  onRefresh: () => Promise<void>;
}) {
  const [catalog, setCatalog] = useState<RouterModelsResult | undefined>();
  const [catalogError, setCatalogError] = useState<string | undefined>();
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(props.settings.modelChoices.map((choice) => choice.key)));
  const [activeModel, setActiveModel] = useState(props.settings.model);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedKeys(new Set(props.settings.modelChoices.map((choice) => choice.key)));
    setActiveModel(props.settings.model);
  }, [props.settings.model, props.settings.modelChoices]);

  useEffect(() => {
    let cancelled = false;
    apiGet<RouterModelsResult>("/mlclaw/api/router-models")
      .then((result) => {
        if (cancelled) {
          return;
        }
        setCatalog(result);
        setCatalogError(result.ok ? undefined : result.error ?? "Router catalog is unavailable.");
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(errorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableChoices = useMemo(
    () => mergeChoices([
      ...props.settings.presetModels,
      ...props.settings.modelChoices,
      ...(catalog?.models ?? []),
    ]),
    [catalog, props.settings.modelChoices, props.settings.presetModels],
  );
  const filteredChoices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return availableChoices;
    }
    return availableChoices.filter((choice) =>
      [
        choice.label,
        choice.modelId,
        choice.provider,
        choice.openclawModel,
        choice.note ?? "",
      ].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [availableChoices, query]);
  const selectedChoices = useMemo(
    () => availableChoices.filter((choice) => selectedKeys.has(choice.key)),
    [availableChoices, selectedKeys],
  );
  const activeChoice = selectedChoices.find((choice) => choice.openclawModel === activeModel);

  useEffect(() => {
    if (selectedChoices.length > 0 && !activeChoice) {
      setActiveModel(selectedChoices[0]?.openclawModel ?? props.settings.model);
    }
  }, [activeChoice, props.settings.model, selectedChoices]);

  const toggleChoice = (choice: ModelChoice) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(choice.key)) {
        next.delete(choice.key);
      } else {
        next.add(choice.key);
        setActiveModel(choice.openclawModel);
      }
      return next;
    });
  };

  const save = async () => {
    props.onNotice(undefined);
    if (!props.session.admin) {
      props.onNotice("Only ML Claw admins can change the model.");
      return;
    }
    if (!activeModel || selectedChoices.length === 0) {
      props.onNotice("Select at least one model/provider and choose the active model.");
      return;
    }
    if (!window.confirm(`Save ${selectedChoices.length} model/provider option(s), set ${activeModel} active, and restart the Space?`)) {
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ ok: boolean; model: string; modelChoices: ModelChoice[]; persistent: boolean; restartPending: boolean }>(
        "/mlclaw/api/settings/model",
        { model: activeModel, modelChoices: selectedChoices },
        props.session.csrfToken,
      );
      props.onNotice(!result.persistent
        ? `Saved ${result.modelChoices.length} model option(s) to runtime state. OpenClaw restarted.`
        : result.restartPending
        ? `Saved ${result.modelChoices.length} model option(s). Space restart requested.`
        : `Saved ${result.modelChoices.length} model option(s). Restart could not be requested from this runtime.`);
      await props.onRefresh();
    } catch (err) {
      props.onNotice(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settingsView">
      <Header title="Settings" subtitle="Runtime configuration for this Space" />
      <section className="panel settingsPanel">
        <h2>Models</h2>
        <p className="muted">Current value: <code>{props.settings.model}</code></p>
        <div className="modelToolbar">
          <input
            className="textInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Router models or providers"
            spellCheck={false}
          />
          <div className="catalogMeta">
            {catalog ? `${availableChoices.length} model/provider options` : "Loading Router catalog"}
            {catalog?.fetchedAt ? ` loaded ${relativeTime(catalog.fetchedAt)}` : ""}
          </div>
        </div>
        {catalogError ? <p className="statusWarn">{catalogError}</p> : null}
        <div className="selectedSummary">
          <strong>{selectedChoices.length}</strong>
          <span>selected</span>
          <code>{activeModel}</code>
        </div>
        <div className="modelList routerModelList">
          {filteredChoices.map((choice) => (
            <div className={selectedKeys.has(choice.key) ? "modelOption selected" : "modelOption"} key={choice.key}>
              <input
                type="checkbox"
                checked={selectedKeys.has(choice.key)}
                onChange={() => toggleChoice(choice)}
                aria-label={`Add ${choice.openclawModel}`}
              />
              <div className="modelOptionBody">
                <div className="modelOptionHeader">
                  <strong>{choice.label}</strong>
                  {choice.preset ? <span className="pill">Preset</span> : null}
                  <span className="providerPill">{choice.provider}</span>
                </div>
                <small>{choice.note ?? choice.openclawModel}</small>
                <code>{choice.openclawModel}</code>
                <div className="modelFacts">
                  <span>{formatPrice(choice.pricing?.input)}</span>
                  <span>{formatPrice(choice.pricing?.output)}</span>
                  <span>{formatContext(choice.contextLength)}</span>
                  <span>{formatLatency(choice.firstTokenLatencyMs)}</span>
                  <span>{formatThroughput(choice.throughput)}</span>
                  <span>{choice.supportsTools ? "Tools" : "No tools"}</span>
                  <span>{choice.supportsStructuredOutput ? "Structured" : "No structured"}</span>
                </div>
                <label className="activeModelControl">
                  <input
                    type="radio"
                    name="activeModel"
                    checked={activeModel === choice.openclawModel}
                    disabled={!selectedKeys.has(choice.key)}
                    onChange={() => setActiveModel(choice.openclawModel)}
                  />
                  <span>Active model</span>
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="buttonRow">
          <button className="primaryButton" type="button" disabled={saving || !props.session.admin} onClick={save}>
            {saving ? "Saving" : "Save and restart"}
          </button>
        </div>
      </section>
    </div>
  );
}

function CredentialsPage(props: {
  session: Session;
  status: Status;
  onNotice: (notice: string | undefined) => void;
  onRefresh: () => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const save = async () => {
    props.onNotice(undefined);
    if (!props.session.admin) {
      props.onNotice("Only ML Claw admins can change credentials.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ ok: boolean; configured: boolean; persistent: boolean }>(
        "/mlclaw/api/credentials/openai",
        { apiKey },
        props.session.csrfToken,
      );
      setApiKey("");
      props.onNotice(result.persistent
        ? "OpenAI key saved as a Space Secret and loaded into the runtime."
        : "OpenAI key loaded into the runtime. Space Secret persistence was not confirmed.");
      await props.onRefresh();
    } catch (err) {
      props.onNotice(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const disconnectHuggingFace = async () => {
    props.onNotice(undefined);
    if (!props.session.admin || !window.confirm("Disconnect both Hugging Face MCP integrations?")) {
      return;
    }
    setDisconnecting(true);
    try {
      await apiPost(
        "/mlclaw/api/integrations/huggingface/disconnect",
        {},
        props.session.csrfToken,
      );
      props.onNotice("Hugging Face MCP and Research Agent were disconnected.");
      await props.onRefresh();
    } catch (err) {
      props.onNotice(errorMessage(err));
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <Header title="Credentials" subtitle="Secrets used by this Space runtime" />
      <section className="panel">
        <h2>Hugging Face integrations</h2>
        <p className={props.status.integrations.configured ? "statusGood" : "statusWarn"}>
          {props.status.integrations.configured
            ? props.status.integrations.identity
              ? `Connected as ${props.status.integrations.identity}.`
              : "Connected using the local Hugging Face token."
            : "Sign in again to authorize Hugging Face MCP and Research Agent."}
        </p>
        <div className="integrationList">
          {props.status.integrations.servers.map((server) => (
            <div className="integrationRow" key={server.id}>
              <strong>{server.name}</strong>
              <span>{props.status.integrations.configured && server.enabled ? "Ready" : "Disconnected"}</span>
            </div>
          ))}
        </div>
        {props.status.integrations.error ? <p className="statusWarn">{props.status.integrations.error}</p> : null}
        <div className="buttonRow">
          {props.status.integrations.source !== "local" ? (
            <a className="primaryButton" href="/oauth/login?intent=integrations&next=%2Fmlclaw%2Fcredentials">
              {props.status.integrations.configured ? "Reconnect" : "Connect"}
            </a>
          ) : null}
          <button
            className="secondaryButton"
            type="button"
            disabled={disconnecting || !props.session.admin || !props.status.integrations.configured || props.status.integrations.source === "local"}
            onClick={disconnectHuggingFace}
          >
            {disconnecting ? "Disconnecting" : "Disconnect"}
          </button>
        </div>
      </section>
      <section className="panel">
        <h2>OpenAI</h2>
        <p className={props.status.openai.configured ? "statusGood" : "statusNeutral"}>
          {props.status.openai.configured ? "OpenAI key is configured." : "OpenAI key is not configured."}
        </p>
        <label className="field">
          <span>OpenAI API key</span>
          <input
            className="textInput"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
        </label>
        <div className="buttonRow">
          <button className="primaryButton" type="button" disabled={saving || !apiKey || !props.session.admin} onClick={save}>
            {saving ? "Saving" : "Save key"}
          </button>
        </div>
      </section>
    </>
  );
}

function StatusPage(props: { status: Status; settings: Settings; onRefresh: () => Promise<void> }) {
  return (
    <>
      <Header title="Status" subtitle="Current runtime and deployment state" />
      <section className="panel">
        <div className="statusRows">
          <Row label="Mode" value={props.status.mode} />
          <Row label="Space" value={props.status.space ?? "Not set"} />
          <Row label="Gateway" value={props.status.openclaw.running ? "Running" : "Not ready"} />
          <Row label="Model" value={props.status.model} />
          <Row label="State bucket" value={props.status.stateBucket ?? props.settings.stateBucket ?? "Not set"} />
          <Row label="State mount" value={props.status.stateMountDir ?? props.settings.stateMountDir ?? "Not set"} />
          <Row label="State prefix" value={props.status.statePrefix ?? "Default"} />
          <Row label="Gateway location" value={props.status.gatewayLocation ?? "Space"} />
          <Row label="Runtime image" value={props.status.runtimeImage ?? "Bundled"} />
          <Row label="Runtime id" value={props.status.runtimeId ?? "Not set"} />
          <Row label="Template rev" value={props.status.templateRev ?? "Not set"} />
        </div>
        <div className="buttonRow">
          <button className="secondaryButton" type="button" onClick={() => void props.onRefresh()}>Refresh</button>
        </div>
      </section>
    </>
  );
}

function Header(props: { title: string; subtitle: string }) {
  return (
    <header className="header">
      <h1>{props.title}</h1>
      <p>{props.subtitle}</p>
    </header>
  );
}

function Banner(props: { children: React.ReactNode }) {
  return <div className="banner">{props.children}</div>;
}

function Metric(props: { label: string; value: string; tone?: "good" | "warn" | "neutral" }) {
  return (
    <section className={`metric ${props.tone ?? "neutral"}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </section>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="row">
      <span>{props.label}</span>
      <code>{props.value}</code>
    </div>
  );
}

function ScreenMessage(props: { title: string; body: string }) {
  return (
    <section className="panel">
      <h1>{props.title}</h1>
      <p>{props.body}</p>
    </section>
  );
}

function mergeChoices(choices: ModelChoice[]): ModelChoice[] {
  const seen = new Set<string>();
  const merged: ModelChoice[] = [];
  for (const choice of choices) {
    if (seen.has(choice.key)) {
      continue;
    }
    seen.add(choice.key);
    merged.push(choice);
  }
  return merged;
}

function formatPrice(value: number | undefined): string {
  return value === undefined ? "-" : `$${value.toFixed(value < 0.1 ? 2 : 2)}`;
}

function formatContext(value: number | undefined): string {
  return value === undefined ? "ctx -" : `ctx ${value.toLocaleString()}`;
}

function formatLatency(value: number | undefined): string {
  return value === undefined ? "ttft -" : `ttft ${(value / 1000).toFixed(2)}s`;
}

function formatThroughput(value: number | undefined): string {
  return value === undefined ? "tok/s -" : `${Math.round(value)} tok/s`;
}

function relativeTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
    credentials: "same-origin",
  });
  return readApiResponse<T>(response);
}

async function apiPost<T>(path: string, body: unknown, csrfToken: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-mlclaw-csrf": csrfToken,
    },
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  return readApiResponse<T>(response);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Request failed with HTTP ${response.status}`);
  }
  if (!response.ok) {
    const message = parsed && typeof parsed === "object" && "error" in parsed ? String(parsed.error) : `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return parsed as T;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function viewFromPath(pathname: string): View {
  if (pathname === "/mlclaw/settings") {
    return "settings";
  }
  if (pathname === "/mlclaw/credentials") {
    return "credentials";
  }
  if (pathname === "/mlclaw/status") {
    return "status";
  }
  return "overview";
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
