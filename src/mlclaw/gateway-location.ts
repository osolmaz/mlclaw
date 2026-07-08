export const GATEWAY_LOCATIONS = ["local", "space"] as const;

export type GatewayLocation = typeof GATEWAY_LOCATIONS[number];

export function parseGatewayLocation(value: string): GatewayLocation {
  if (value === "local" || value === "space") {
    return value;
  }
  throw new Error("gateway must be one of: local, space");
}
