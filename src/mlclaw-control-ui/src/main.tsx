import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Session = {
  user: string;
  admin: boolean;
  csrfToken: string;
};

type RecommendedModel = {
  id: string;
  label: string;
  note: string;
};

type Settings = {
  agentName: string | null;
  model: string;
  stateBucket: string | null;
  statePrefix: string | null;
  gatewayLocation: string | null;
  runtimeImage: string | null;
  runtimeId: string | null;
  templateRev: string | null;
  allowedUsers: string[];
  adminUsers: string[];
  recommendedModels: RecommendedModel[];
};

type Status = {
  ok: boolean;
  mode: string;
  agent: string | null;
  model: string;
  space: string | null;
  stateBucket: string | null;
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
    <Frame view={view} onNavigate={navigate} session={state.session}>
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

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/">
          <img src="/assets/mlclaw.svg" alt="" />
          <span>ML Claw</span>
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
      <Header title={props.settings.agentName ?? "ML Claw"} subtitle="Deployment overview" />
      <div className="grid">
        <Metric label="Gateway" value={props.status.openclaw.running ? "Running" : "Not ready"} tone={props.status.openclaw.running ? "good" : "warn"} />
        <Metric label="Model" value={props.settings.model} />
        <Metric label="Bucket" value={props.settings.stateBucket ?? "Not set"} />
        <Metric label="OpenAI" value={props.status.openai.configured ? "Configured" : "Not configured"} tone={props.status.openai.configured ? "good" : "neutral"} />
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
  const [selected, setSelected] = useState(props.settings.model);
  const [custom, setCustom] = useState(props.settings.model);
  const [saving, setSaving] = useState(false);
  const model = useMemo(() => selected === "custom" ? custom.trim() : selected, [custom, selected]);

  const save = async () => {
    props.onNotice(undefined);
    if (!props.session.admin) {
      props.onNotice("Only ML Claw admins can change the model.");
      return;
    }
    if (!model) {
      props.onNotice("Enter a model identifier.");
      return;
    }
    if (!window.confirm(`Save OPENCLAW_MODEL as ${model} and restart the Space?`)) {
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ ok: boolean; model: string; restartPending: boolean }>(
        "/mlclaw/api/settings/model",
        { model },
        props.session.csrfToken,
      );
      props.onNotice(result.restartPending
        ? `Model saved as ${result.model}. Space restart requested.`
        : `Model saved as ${result.model}. Restart could not be requested from this runtime.`);
      await props.onRefresh();
    } catch (err) {
      props.onNotice(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Settings" subtitle="Runtime configuration for this Space" />
      <section className="panel">
        <h2>Model</h2>
        <p className="muted">Current value: <code>{props.settings.model}</code></p>
        <div className="modelList">
          {props.settings.recommendedModels.map((item) => (
            <label className={selected === item.id ? "modelOption selected" : "modelOption"} key={item.id}>
              <input
                type="radio"
                name="model"
                value={item.id}
                checked={selected === item.id}
                onChange={() => {
                  setSelected(item.id);
                  setCustom(item.id);
                }}
              />
              <span>
                <strong>{item.label}</strong>
                <small>{item.note}</small>
                <code>{item.id}</code>
              </span>
            </label>
          ))}
          <label className={selected === "custom" ? "modelOption selected" : "modelOption"}>
            <input type="radio" name="model" value="custom" checked={selected === "custom"} onChange={() => setSelected("custom")} />
            <span>
              <strong>Custom</strong>
              <small>Advanced model identifier</small>
              <input
                className="textInput"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onFocus={() => setSelected("custom")}
                spellCheck={false}
              />
            </span>
          </label>
        </div>
        <div className="buttonRow">
          <button className="primaryButton" type="button" disabled={saving || !props.session.admin} onClick={save}>
            {saving ? "Saving" : "Save and restart"}
          </button>
        </div>
      </section>
    </>
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

  return (
    <>
      <Header title="Credentials" subtitle="Secrets used by this Space runtime" />
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
