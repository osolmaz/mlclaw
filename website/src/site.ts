export const SITE_NAME = "ML Claw";
export const REPOSITORY_URL = "https://github.com/huggingface/mlclaw";
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;

export function documentTitle(title: string): string {
  return `${title} · ${SITE_NAME}`;
}
