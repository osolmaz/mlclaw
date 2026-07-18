import { describe, expect, it } from "vitest";
import { documentTitle, LICENSE_URL, REPOSITORY_URL, SITE_NAME } from "../src/site";

describe("site metadata", () => {
  it("keeps public links on the canonical repository", () => {
    expect(REPOSITORY_URL).toBe("https://github.com/huggingface/mlclaw");
    expect(LICENSE_URL).toBe(`${REPOSITORY_URL}/blob/main/LICENSE`);
  });

  it("formats documentation titles consistently", () => {
    expect(documentTitle("Getting started")).toBe(`Getting started · ${SITE_NAME}`);
  });
});
