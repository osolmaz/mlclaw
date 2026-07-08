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
  return cleaned;
}

export function namesFor(owner: string, agentName: string): { space: string; bucket: string } {
  return {
    space: `${owner}/${agentName}`,
    bucket: `${owner}/${agentName}-data`,
  };
}

