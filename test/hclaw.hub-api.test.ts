import { describe, expect, it } from "vitest";
import { HubApi } from "../src/hclaw/hub-api.js";

describe("HubApi Space commits", () => {
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
      title: "Deploy Hugging Claw test",
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
          summary: "Deploy Hugging Claw test",
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
});
