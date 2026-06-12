import { describe, expect, it } from "vitest";
import { main } from "../src/hclaw/cli.js";
import type { HubApi, SpaceRuntime } from "../src/hclaw/hub-api.js";

type PromptAnswer = string | boolean;

function createPrompt(answers: PromptAnswer[], interactive = true) {
  const notes: Array<{ message: string; title?: string }> = [];
  return {
    notes,
    prompt: {
      isInteractive: () => interactive,
      intro: () => undefined,
      outro: () => undefined,
      note: (message: string, title?: string) => {
        notes.push({ message, ...(title ? { title } : {}) });
      },
      text: async () => String(answers.shift() ?? ""),
      password: async () => String(answers.shift() ?? ""),
      confirm: async () => Boolean(answers.shift()),
      cancel: () => undefined,
    },
  };
}

function createFakeHub() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const variables = new Map<string, { value?: string }>();
  const secrets = new Map<string, { key: string }>();
  const hub = {
    calls,
    async whoami() {
      calls.push({ name: "whoami", args: [] });
      return { name: "alice" };
    },
    async createBucket(...args: unknown[]) {
      calls.push({ name: "createBucket", args });
    },
    async createDockerSpace(...args: unknown[]) {
      calls.push({ name: "createDockerSpace", args });
    },
    async addSpaceVariable(repoId: string, key: string, value: string) {
      calls.push({ name: "addSpaceVariable", args: [repoId, key, value] });
      variables.set(key, { value });
    },
    async deleteSpaceVariable(...args: unknown[]) {
      calls.push({ name: "deleteSpaceVariable", args });
    },
    async getSpaceVariables() {
      calls.push({ name: "getSpaceVariables", args: [] });
      return variables;
    },
    async addSpaceSecret(repoId: string, key: string, value: string) {
      calls.push({ name: "addSpaceSecret", args: [repoId, key, value] });
      secrets.set(key, { key });
    },
    async getSpaceSecrets() {
      calls.push({ name: "getSpaceSecrets", args: [] });
      return secrets;
    },
    async restartSpace(...args: unknown[]) {
      calls.push({ name: "restartSpace", args });
    },
    async getSpaceRuntime(): Promise<SpaceRuntime> {
      calls.push({ name: "getSpaceRuntime", args: [] });
      return { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 };
    },
    async fetchSpaceLogs() {
      calls.push({ name: "fetchSpaceLogs", args: [] });
      return "restored snapshot\nsnapshot 2026 uploaded";
    },
    async assertBucketAccessible(...args: unknown[]) {
      calls.push({ name: "assertBucketAccessible", args });
    },
    async requestSpaceHardware(...args: unknown[]) {
      calls.push({ name: "requestSpaceHardware", args });
      return { stage: "RUNNING", hardware: args[1], requested_hardware: args[1], sleep_time: args[2] as number };
    },
    async setSpaceSleepTime(...args: unknown[]) {
      calls.push({ name: "setSpaceSleepTime", args });
      return { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: args[1] as number };
    },
  };
  return hub as typeof hub & HubApi;
}

function createRuntime(hub: HubApi, prompt: ReturnType<typeof createPrompt>["prompt"], stderr: string[] = []) {
  return {
    env: {},
    stdout: { log: () => undefined },
    stderr: { error: (message: unknown) => stderr.push(String(message)) },
    readToken: async () => "hf_test_token",
    hubFactory: () => hub,
    pushTemplateToSpace: async () => ({ templateRev: "test-template" }),
    getTelegramBot: async () => ({
      id: 1,
      is_bot: true,
      first_name: "Research",
      username: "research_bot",
    }),
    prompt,
  };
}

describe("hclaw CLI", () => {
  it("runs bootstrap as the default command and prompts for Telegram setup", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([true, "telegram-token", "7216393410", true]);

    const code = await main(["--gateway-token", "gateway-token"], createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(notes).toEqual([
      expect.objectContaining({
        title: "Cost warning",
        message: expect.stringContaining("cpu-upgrade at $0.03/hour"),
      }),
    ]);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: [
        "alice/research",
        {
          private: true,
          hardware: "cpu-upgrade",
          sleepTimeSeconds: -1,
        },
      ],
    });
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_BOT_TOKEN", "telegram-token"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_ALLOWED_USERS", "7216393410"],
    });
  });

  it("fails non-interactive Telegram bootstrap without paid hardware consent", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main([
      "bootstrap",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "7216393410",
      "--gateway-token",
      "gateway-token",
    ], createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("paid Hugging Face Space hardware requires explicit consent");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("fails non-interactive paid bootstrap hardware without consent even without Telegram", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--hardware",
      "cpu-upgrade",
      "--gateway-token",
      "gateway-token",
    ], createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("paid Hugging Face Space hardware requires explicit consent");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("updates Space hardware settings through the Hugging Face settings API", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);

    const code = await main([
      "settings",
      "alice/research",
      "--hardware",
      "cpu-upgrade",
      "--sleep-time",
      "-1",
      "--yes",
    ], createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
  });
});
