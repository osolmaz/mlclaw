import { describe, expect, it } from "vitest";
import { getTelegramBot } from "../src/mlclaw/telegram.js";

describe("Telegram bot discovery", () => {
  it("retries transient getMe fetch failures", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("network reset");
      }
      return Response.json({
        ok: true,
        result: {
          id: 123,
          username: "research_bot",
        },
      });
    };

    await expect(getTelegramBot("token", "https://telegram.example", fetchImpl as typeof fetch)).resolves.toMatchObject({
      id: 123,
      username: "research_bot",
    });
    expect(calls).toBe(2);
  });

  it("keeps Telegram context in repeated getMe fetch failures", async () => {
    const fetchImpl = async () => {
      throw new Error("network reset");
    };

    await expect(getTelegramBot("token", "https://telegram.example", fetchImpl as typeof fetch)).rejects.toThrow(
      "Telegram getMe request failed after 4 attempts: network reset",
    );
  });
});
