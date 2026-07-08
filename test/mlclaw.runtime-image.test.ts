import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("runtime image Dockerfile", () => {
  it("healthchecks the ML Claw gateway port", async () => {
    const dockerfile = await fs.readFile("Dockerfile", "utf8");

    expect(dockerfile).toContain("ENV PORT=7860");
    expect(dockerfile).toContain("ENV OPENCLAW_GATEWAY_PORT=7861");
    expect(dockerfile).toContain("EXPOSE 7860");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("--interval=30s");
    expect(dockerfile).toContain("--start-period=60s");
    expect(dockerfile).toContain("process.env.PORT");
    expect(dockerfile).toContain("/health");
    expect(dockerfile).toContain("python3 -m pip install --break-system-packages --no-cache-dir");
    expect(dockerfile).toContain("\"huggingface_hub==1.22.0\"");
    expect(dockerfile).toContain("\"datasets==5.0.0\"");
    expect(dockerfile).toContain("\"safetensors==0.8.0\"");
    expect(dockerfile).toContain("\"hf-discover==1.3.7\"");
    expect(dockerfile).toContain("--no-deps");
    expect(dockerfile).toContain("\"uv==0.11.28\"");
    expect(dockerfile).toContain("COPY --from=sync-build /build/dist/hf-tooling-seed.js /app/hf-tooling-seed.js");
    expect(dockerfile).not.toContain("18789/healthz");
  });
});
