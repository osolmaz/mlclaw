import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ensureHfToken, readToken } from "../src/mlclaw/auth.js";
import { HF_ACCOUNT_CREATE_URL, HF_CLI_INSTALL_COMMAND, type HfCliRuntime } from "../src/mlclaw/hf-cli.js";

function createHfCli(executable?: string): HfCliRuntime & {
  findExecutable: ReturnType<typeof vi.fn>;
  install: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
  openUrl: ReturnType<typeof vi.fn>;
} {
  return {
    findExecutable: vi.fn().mockResolvedValue(executable),
    install: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    openUrl: vi.fn().mockResolvedValue(true),
  };
}

function createPrompt(answers: boolean[], interactive = true) {
  const notes: Array<{ message: string; title?: string }> = [];
  const confirmations: string[] = [];
  return {
    notes,
    confirmations,
    prompt: {
      isInteractive: () => interactive,
      note: (message: string, title?: string) => notes.push({ message, ...(title ? { title } : {}) }),
      confirm: async (message: string) => {
        confirmations.push(message);
        return answers.shift() ?? false;
      },
    },
  };
}

describe("Hugging Face credential onboarding", () => {
  it("reads the standard token location under HF_HOME", async () => {
    const hfHome = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-home-"));
    await fs.writeFile(path.join(hfHome, "token"), "hf_test_token\n");

    await expect(readToken({ HF_HOME: hfHome })).resolves.toBe("hf_test_token");
  });

  it("uses an existing token without invoking the CLI", async () => {
    const hfCli = createHfCli();
    const { prompt } = createPrompt([]);

    await expect(ensureHfToken({ readToken: async () => "hf_existing", hfCli, prompt })).resolves.toBe("hf_existing");
    expect(hfCli.findExecutable).not.toHaveBeenCalled();
  });

  it("installs the CLI, directs account creation, signs in, and resumes", async () => {
    const hfCli = createHfCli();
    hfCli.findExecutable.mockResolvedValueOnce(undefined).mockResolvedValueOnce("/home/alice/.local/bin/hf");
    const readToken = vi.fn().mockRejectedValueOnce(new Error("missing token")).mockResolvedValueOnce("hf_new");
    const { prompt, notes, confirmations } = createPrompt([true, false, true]);

    await expect(ensureHfToken({ readToken, hfCli, prompt })).resolves.toBe("hf_new");
    expect(hfCli.install).toHaveBeenCalledOnce();
    expect(hfCli.openUrl).toHaveBeenCalledWith(HF_ACCOUNT_CREATE_URL);
    expect(hfCli.login).toHaveBeenCalledWith("/home/alice/.local/bin/hf");
    expect(confirmations).toEqual([
      "Install the Hugging Face CLI now?",
      "Do you already have a Hugging Face account?",
      "Have you created your Hugging Face account?",
    ]);
    expect(notes).toContainEqual(expect.objectContaining({ message: expect.stringContaining(HF_CLI_INSTALL_COMMAND) }));
    expect(notes).toContainEqual(expect.objectContaining({ message: expect.stringContaining(HF_ACCOUNT_CREATE_URL) }));
  });

  it("uses an installed CLI to sign in an existing account", async () => {
    const hfCli = createHfCli("/usr/local/bin/hf");
    const readToken = vi.fn().mockRejectedValueOnce(new Error("missing token")).mockResolvedValueOnce("hf_new");
    const { prompt, confirmations } = createPrompt([true]);

    await expect(ensureHfToken({ readToken, hfCli, prompt })).resolves.toBe("hf_new");
    expect(hfCli.install).not.toHaveBeenCalled();
    expect(hfCli.login).toHaveBeenCalledWith("/usr/local/bin/hf");
    expect(confirmations).toEqual(["Do you already have a Hugging Face account?"]);
  });

  it("explains manual installation when installation is declined", async () => {
    const hfCli = createHfCli();
    const { prompt } = createPrompt([false]);

    await expect(
      ensureHfToken({
        readToken: async () => await Promise.reject(new Error("missing token")),
        hfCli,
        prompt,
      }),
    ).rejects.toThrow(HF_CLI_INSTALL_COMMAND);
    expect(hfCli.install).not.toHaveBeenCalled();
  });

  it("preserves the missing-token failure in non-interactive use", async () => {
    const hfCli = createHfCli();
    const { prompt } = createPrompt([], false);

    await expect(
      ensureHfToken({
        readToken: async () => await Promise.reject(new Error("missing token")),
        hfCli,
        prompt,
      }),
    ).rejects.toThrow("missing token");
    expect(hfCli.findExecutable).not.toHaveBeenCalled();
  });
});
