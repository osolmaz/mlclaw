import { describe, expect, it } from "vitest";
import {
  CliTailscaleRunner,
  parseTailscaleStatus,
  tailscaleAccessOrigin,
  tailscaleServeMappingState,
  type TailscaleServeMapping,
} from "../src/mlclaw/tailscale.js";

const mapping: TailscaleServeMapping = {
  dnsName: "isengard.example.ts.net",
  httpsPort: 7860,
  target: "http://127.0.0.1:7860",
};

describe("Tailscale access", () => {
  it("discovers only an online running node with a valid MagicDNS name", () => {
    expect(
      parseTailscaleStatus({
        BackendState: "Running",
        Self: { Online: true, DNSName: "Isengard.Example.ts.net." },
      }),
    ).toEqual({ ready: true, dnsName: "isengard.example.ts.net" });
    expect(parseTailscaleStatus({ BackendState: "NeedsLogin", Self: {} })).toEqual({
      ready: false,
      reason: "Tailscale is NeedsLogin",
    });
    expect(parseTailscaleStatus({ BackendState: "Running", Self: { Online: false } })).toEqual({
      ready: false,
      reason: "Tailscale is offline",
    });
  });

  it("recognizes only the exact HTTPS root proxy as owned", () => {
    expect(tailscaleServeMappingState({}, mapping)).toBe("free");
    expect(tailscaleServeMappingState(serveConfig(mapping), mapping)).toBe("owned");
    expect(tailscaleServeMappingState(serveConfig({ ...mapping, target: "http://127.0.0.1:9000" }), mapping)).toBe(
      "conflict",
    );
    expect(
      tailscaleServeMappingState(
        { ...serveConfig(mapping), AllowFunnel: { [`${mapping.dnsName}:${mapping.httpsPort}`]: true } },
        mapping,
      ),
    ).toBe("conflict");
    expect(tailscaleServeMappingState({ Foreground: { session: serveConfig(mapping) } }, mapping)).toBe("conflict");
    expect(
      tailscaleServeMappingState(
        {
          ...serveConfig(mapping),
          Web: {
            [`${mapping.dnsName}:${mapping.httpsPort}`]: {
              Handlers: {
                "/": { Proxy: mapping.target },
                "/other": { Proxy: "http://127.0.0.1:9000" },
              },
            },
          },
        },
        mapping,
      ),
    ).toBe("conflict");
  });

  it("creates and verifies one scoped Serve mapping", async () => {
    const calls: string[][] = [];
    const configs = [{}, serveConfig(mapping)];
    const runner = new CliTailscaleRunner(async (args) => {
      calls.push(args);
      if (args.join(" ") === "serve status --json") {
        return { stdout: JSON.stringify(configs.shift()), stderr: "" };
      }
      return { stdout: "", stderr: "" };
    });

    await expect(runner.ensureMapping(mapping)).resolves.toBe("created");
    expect(calls).toEqual([
      ["serve", "status", "--json"],
      ["serve", "--bg", "--yes", "--https=7860", "http://127.0.0.1:7860"],
      ["serve", "status", "--json"],
    ]);
  });

  it("preserves a drifted handler instead of deleting it", async () => {
    const calls: string[][] = [];
    const runner = new CliTailscaleRunner(async (args) => {
      calls.push(args);
      return {
        stdout: JSON.stringify(serveConfig({ ...mapping, target: "http://127.0.0.1:9000" })),
        stderr: "",
      };
    });

    await expect(runner.removeMapping(mapping)).resolves.toBe("drifted");
    expect(calls).toEqual([["serve", "status", "--json"]]);
  });

  it("formats default and custom HTTPS origins", () => {
    expect(tailscaleAccessOrigin({ dnsName: mapping.dnsName, httpsPort: 443 })).toBe("https://isengard.example.ts.net");
    expect(tailscaleAccessOrigin(mapping)).toBe("https://isengard.example.ts.net:7860");
  });

  it("preserves an actionable Tailscale setup URL from command output", async () => {
    const error = Object.assign(new Error("command failed"), {
      stdout: "To enable Serve, visit: https://login.tailscale.com/f/serve?node=test",
    });
    const runner = new CliTailscaleRunner(async () => {
      throw error;
    });

    await expect(runner.discover()).resolves.toEqual({
      ready: false,
      reason: "To enable Serve, visit: https://login.tailscale.com/f/serve?node=test",
    });
  });
});

function serveConfig(value: TailscaleServeMapping): Record<string, unknown> {
  return {
    TCP: { [value.httpsPort]: { HTTPS: true } },
    Web: {
      [`${value.dnsName}:${value.httpsPort}`]: {
        Handlers: { "/": { Proxy: value.target } },
      },
    },
  };
}
