export type TelegramBot = {
  id: number;
  username: string;
  first_name?: string;
};

const TELEGRAM_GET_ME_TIMEOUT_MS = 30_000;
const TELEGRAM_GET_ME_ATTEMPTS = 4;

export async function getTelegramBot(
  token: string,
  apiRoot = "https://api.telegram.org",
  fetchImpl: typeof fetch = fetch,
): Promise<TelegramBot> {
  const root = apiRoot.replace(/\/+$/, "");
  const url = `${root}/bot${token}/getMe`;
  const response = await fetchWithRetry(url, fetchImpl);
  if (!response.ok) {
    throw new Error(`Telegram getMe failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { ok?: boolean; result?: TelegramBot; description?: string };
  if (!body.ok || !body.result?.username) {
    throw new Error(`Telegram getMe failed: ${body.description ?? "missing bot username"}`);
  }
  return body.result;
}

async function fetchWithRetry(url: string, fetchImpl: typeof fetch): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < TELEGRAM_GET_ME_ATTEMPTS; attempt += 1) {
    try {
      return await fetchImpl(url, { signal: AbortSignal.timeout(TELEGRAM_GET_ME_TIMEOUT_MS) });
    } catch (err) {
      lastError = err;
      if (attempt < TELEGRAM_GET_ME_ATTEMPTS - 1) {
        await delay(250 * 2 ** attempt);
      }
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Telegram getMe request failed after ${TELEGRAM_GET_ME_ATTEMPTS} attempts: ${detail}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
