export const AGENT_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function assertAgentName(value: string): string {
  if (!AGENT_NAME_PATTERN.test(value)) {
    throw new Error(`invalid agent name: ${value}`);
  }
  return value;
}

export function slugifyAgentName(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^@/, "")
    .replace(/(?:[_-]?bot)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
  if (!cleaned) {
    throw new Error(`cannot derive an agent name from ${raw}`);
  }
  return assertAgentName(cleaned);
}

export function namesFor(owner: string, agentName: string): { space: string; bucket: string } {
  return {
    space: `${owner}/${agentName}`,
    bucket: `${owner}/${agentName}-data`,
  };
}
