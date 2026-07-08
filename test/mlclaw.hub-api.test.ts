import { describe, expect, it } from "vitest";
import { HubApi } from "../src/mlclaw/hub-api.js";

describe("HubApi Space commits", () => {
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
});
