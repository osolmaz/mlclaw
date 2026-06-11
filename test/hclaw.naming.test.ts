import { describe, expect, it } from "vitest";
import { namesFor, slugifyAgentName } from "../src/hclaw/naming.js";

describe("hclaw naming", () => {
  it("derives deployable names from Telegram bot usernames", () => {
    expect(slugifyAgentName("@Bob_Bot")).toBe("bob");
    expect(slugifyAgentName("research-helper-bot")).toBe("research-helper");
    expect(slugifyAgentName("Onur Claw")).toBe("onur-claw");
  });

  it("derives space and bucket ids from the agent name", () => {
    expect(namesFor("alice", "bob")).toEqual({
      space: "alice/bob",
      bucket: "alice/bob-data",
    });
  });
});
