import fs from "node:fs";

const [probePath] = process.argv.slice(2);

if (!probePath) {
  process.exit(0);
}

try {
  const payload = JSON.parse(fs.readFileSync(probePath, "utf8"));
  if (payload?.ok && payload?.result?.username) {
    console.log(`[telegram-probe] curl getMe ok (@${payload.result.username})`);
  } else {
    console.log("[telegram-probe] curl getMe returned an unexpected response");
  }
} catch {
  console.log("[telegram-probe] curl getMe response could not be parsed");
}
