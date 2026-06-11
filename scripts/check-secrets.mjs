import { execFileSync } from "node:child_process";
import fs from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const patterns = [
  { name: "Hugging Face token", regex: /hf_[A-Za-z0-9]{20,}/g },
  { name: "Telegram bot token", regex: /\b\d{7,12}:AA[A-Za-z0-9_-]{30,}\b/g },
  { name: "OpenAI API key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
];

const allowlisted = new Set(["hf_test_token"]);
const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) {
    continue;
  }
  const text = bytes.toString("utf8");
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      if (!allowlisted.has(match[0])) {
        findings.push(`${file}: ${pattern.name}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No obvious secrets found.");
