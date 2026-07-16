import { describe, expect, it } from "vitest";
import { HubApi } from "../src/mlclaw/hub-api.js";

describe("HubApi Space commits", () => {
  it("uses parent-commit compare-and-swap for deployment control", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const parent = "a".repeat(40);
    const next = "b".repeat(40);
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        const request = { url: String(url), init: init ?? {} };
        requests.push(request);
        if (request.url.endsWith("/api/whoami-v2")) return Response.json({ name: "alice" });
        if (request.url.endsWith("/api/repos/create")) return Response.json({});
        if (request.url.endsWith("/commit/main")) return Response.json({ commitOid: next });
        if (request.url.includes("/api/models/")) return Response.json({ sha: parent });
        if (request.url.includes("/resolve/")) return new Response("missing", { status: 404 });
        throw new Error(`unexpected request ${request.url}`);
      },
    });

    const store = await hub.deploymentControlStore("alice", "11111111-1111-5111-a111-111111111111");
    await expect(store.read()).resolves.toEqual({ value: null, revision: parent });
    await expect(store.compareAndSwap(parent, { fencingToken: "token" })).resolves.toBe(next);

    const commit = requests.find((request) => request.url.endsWith("/commit/main"));
    const lines = String(commit?.init.body)
      .split("\n")
      .map((line) => JSON.parse(line)) as Array<{ key: string; value: Record<string, unknown> }>;
    expect(lines[0]?.value.parentCommit).toBe(parent);
  });

  it("lists owned buckets across Hub pagination", async () => {
    const requests: string[] = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url) => {
        const value = String(url);
        requests.push(value);
        return value.endsWith("page=2")
          ? new Response(JSON.stringify([{ id: "alice/second" }]), { status: 200 })
          : new Response(JSON.stringify([{ id: "alice/first" }]), {
              status: 200,
              headers: { Link: '<https://huggingface.co/api/buckets/me?page=2>; rel="next"' },
            });
      },
    });

    await expect(hub.listBuckets()).resolves.toEqual(["alice/first", "alice/second"]);
    expect(requests).toEqual(["https://huggingface.co/api/buckets/me", "https://huggingface.co/api/buckets/me?page=2"]);
  });

  it("lists buckets from an explicit organization namespace", async () => {
    const requests: string[] = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url) => {
        requests.push(String(url));
        return Response.json([{ id: "research-org/shared-state" }]);
      },
    });

    await expect(hub.listBuckets("research-org")).resolves.toEqual(["research-org/shared-state"]);
    expect(requests).toEqual(["https://huggingface.co/api/buckets/research-org"]);
  });

  it("creates Docker Spaces as private by default", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        if (String(url).endsWith("/api/whoami-v2")) {
          return new Response(JSON.stringify({ name: "alice" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
      },
    });

    await hub.createDockerSpace("alice/research");

    const request = requests.find((entry) => entry.url === "https://huggingface.co/api/repos/create");
    expect(request).toBeDefined();
    expect(request?.init.method).toBe("POST");
    expect(JSON.parse(String(request?.init.body))).toMatchObject({
      name: "research",
      organization: null,
      type: "space",
      sdk: "docker",
      private: true,
    });
  });

  it("creates public Docker Spaces only when explicitly requested", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        if (String(url).endsWith("/api/whoami-v2")) {
          return new Response(JSON.stringify({ name: "alice" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
      },
    });

    await hub.createDockerSpace("alice/research", { private: false });

    const request = requests.find((entry) => entry.url === "https://huggingface.co/api/repos/create");
    expect(request).toBeDefined();
    expect(JSON.parse(String(request?.init.body))).toMatchObject({
      name: "research",
      organization: null,
      type: "space",
      sdk: "docker",
      private: false,
    });
  });

  it("uploads files and deletes stale paths through the commit API", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
      },
    });

    await hub.commitSpaceFiles("alice/research", {
      title: "Deploy ML Claw test",
      files: [{ path: "README.md", content: Buffer.from("hello") }],
      deletePaths: ["old.txt"],
    });

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://huggingface.co/api/spaces/alice/research/commit/main");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer hf_test_token",
      "Content-Type": "application/x-ndjson",
    });
    const body = String(request.init.body);
    const lines = body.split("\n").map((line) => JSON.parse(line)) as Array<{
      key: string;
      value: Record<string, unknown>;
    }>;
    expect(lines).toEqual([
      {
        key: "header",
        value: {
          summary: "Deploy ML Claw test",
        },
      },
      {
        key: "file",
        value: {
          path: "README.md",
          content: "aGVsbG8=",
          encoding: "base64",
        },
      },
      {
        key: "deletedFile",
        value: {
          path: "old.txt",
        },
      },
    ]);
  });

  it("requests Space hardware with Hugging Face's flavor payload", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ hardware: { current: "cpu-upgrade", requested: "cpu-upgrade" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    await hub.requestSpaceHardware("alice/research", "cpu-upgrade", -1);

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://huggingface.co/api/spaces/alice/research/hardware");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer hf_test_token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request.init.body))).toEqual({
      flavor: "cpu-upgrade",
      sleepTimeSeconds: -1,
    });
  });

  it("sets Space sleep time with Hugging Face's seconds payload", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ sleep_time: -1 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    await hub.setSpaceSleepTime("alice/research", -1);

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.url).toBe("https://huggingface.co/api/spaces/alice/research/sleeptime");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer hf_test_token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(request.init.body))).toEqual({ seconds: -1 });
  });

  it("reads Space volumes from Space info when the runtime endpoint omits them", async () => {
    const requests: string[] = [];
    const hub = new HubApi({
      token: "hf_test_token",
      fetch: async (url) => {
        const textUrl = String(url);
        requests.push(textUrl);
        if (textUrl.endsWith("/api/spaces/alice/research/runtime")) {
          return new Response(JSON.stringify({ stage: "RUNNING" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (textUrl.endsWith("/api/spaces/alice/research")) {
          return new Response(
            JSON.stringify({
              runtime: {
                volumes: [
                  {
                    type: "bucket",
                    source: "alice/research-data",
                    mountPath: "/data/mlclaw-state",
                    readOnly: false,
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        return new Response("not found", { status: 404 });
      },
    });

    const runtime = await hub.getSpaceRuntime("alice/research");

    expect(requests).toEqual([
      "https://huggingface.co/api/spaces/alice/research/runtime",
      "https://huggingface.co/api/spaces/alice/research",
    ]);
    expect(runtime).toEqual({
      stage: "RUNNING",
      volumes: [
        {
          type: "bucket",
          source: "alice/research-data",
          mountPath: "/data/mlclaw-state",
          readOnly: false,
        },
      ],
    });
  });
});
