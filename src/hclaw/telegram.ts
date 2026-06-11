export type TelegramBot = {
  id: number;
  username: string;
  first_name?: string;
};

export async function getTelegramBot(token: string, apiRoot = "https://api.telegram.org"): Promise<TelegramBot> {
  const root = apiRoot.replace(/\/+$/, "");
  const response = await fetch(`${root}/bot${token}/getMe`);
  if (!response.ok) {
    throw new Error(`Telegram getMe failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { ok?: boolean; result?: TelegramBot; description?: string };
  if (!body.ok || !body.result?.username) {
    throw new Error(`Telegram getMe failed: ${body.description ?? "missing bot username"}`);
  }
  return body.result;
}

